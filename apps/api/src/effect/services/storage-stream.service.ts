import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
	Chunk,
	Context,
	Duration,
	Effect,
	Layer,
	Schedule,
	Sink,
	Stream,
	pipe,
} from 'effect';
import { createReadStream, createWriteStream } from 'fs';
import { mkdir, unlink } from 'fs/promises';
import { dirname, join } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

import { config } from '@/config.js';

// Error types
export class StorageStreamError {
	readonly _tag = 'StorageStreamError';
	constructor(
		readonly operation: string,
		readonly key: string,
		readonly cause?: unknown,
	) {}
}

export class StorageNotFoundError {
	readonly _tag = 'StorageNotFoundError';
	constructor(readonly key: string) {}
}

// Progress tracking
export interface UploadProgress {
	bytesUploaded: number;
	totalBytes: number;
	percentage: number;
}

export interface DownloadProgress {
	bytesDownloaded: number;
	totalBytes?: number;
	percentage?: number;
}

// Service definition
export class StorageStreamService extends Context.Tag('StorageStreamService')<
	StorageStreamService,
	{
		// Stream-based upload with progress
		readonly uploadStream: (
			key: string,
			stream: Stream.Stream<Uint8Array, never, never>,
			contentType?: string,
			onProgress?: (progress: UploadProgress) => void,
		) => Effect.Effect<
			{ key: string; url: string; size: number },
			StorageStreamError,
			never
		>;

		// Stream-based download with progress
		readonly downloadStream: (
			key: string,
			onProgress?: (progress: DownloadProgress) => void,
		) => Stream.Stream<
			Uint8Array,
			StorageStreamError | StorageNotFoundError,
			never
		>;

		// Upload from file path with streaming
		readonly uploadFile: (
			key: string,
			filePath: string,
			contentType?: string,
			onProgress?: (progress: UploadProgress) => void,
		) => Effect.Effect<
			{ key: string; url: string; size: number },
			StorageStreamError,
			never
		>;

		// Download to file path with streaming
		readonly downloadFile: (
			key: string,
			filePath: string,
			onProgress?: (progress: DownloadProgress) => void,
		) => Effect.Effect<void, StorageStreamError | StorageNotFoundError, never>;

		// Multipart upload for large files
		readonly uploadLarge: (
			key: string,
			stream: Stream.Stream<Uint8Array, never, never>,
			contentType?: string,
			partSize?: number,
			onProgress?: (progress: UploadProgress) => void,
		) => Effect.Effect<
			{ key: string; url: string; size: number },
			StorageStreamError,
			never
		>;

		// Generate presigned URL
		readonly generatePresignedUrl: (
			key: string,
			expiresInSeconds?: number,
		) => Effect.Effect<string, StorageStreamError, never>;

		// Check if object exists
		readonly exists: (
			key: string,
		) => Effect.Effect<boolean, StorageStreamError, never>;

		// Get object metadata
		readonly getMetadata: (
			key: string,
		) => Effect.Effect<
			{ size: number; contentType?: string; lastModified?: Date },
			StorageStreamError | StorageNotFoundError,
			never
		>;

		// Delete object
		readonly delete: (
			key: string,
		) => Effect.Effect<void, StorageStreamError, never>;
	}
>() {}

// S3 Implementation
class S3StorageStreamServiceImpl {
	private client: S3Client;
	private bucket: string;

	constructor() {
		const isR2 = !!config.CLOUDFLARE_R2_ENDPOINT;

		this.client = new S3Client(
			isR2
				? {
						region: 'auto',
						endpoint: config.CLOUDFLARE_R2_ENDPOINT,
						credentials: {
							accessKeyId: config.CLOUDFLARE_R2_ACCESS_KEY_ID!,
							secretAccessKey: config.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
						},
						forcePathStyle: true,
					}
				: {
						region: config.AWS_REGION || 'us-east-1',
						credentials: {
							accessKeyId: config.AWS_ACCESS_KEY_ID!,
							secretAccessKey: config.AWS_SECRET_ACCESS_KEY!,
						},
					},
		);

		this.bucket = isR2
			? config.CLOUDFLARE_R2_BUCKET!
			: config.AWS_S3_BUCKET || 'mutate-storage';
	}

	uploadStream(
		key: string,
		stream: Stream.Stream<Uint8Array, never, never>,
		contentType?: string,
		onProgress?: (progress: UploadProgress) => void,
	) {
		const self = this;
		return Effect.gen(function* () {
			let totalBytes = 0;
			const chunks: Uint8Array[] = [];

			// Collect chunks and track progress
			yield* stream.pipe(
				Stream.tap((chunk) =>
					Effect.sync(() => {
						chunks.push(chunk);
						totalBytes += chunk.length;
						if (onProgress) {
							onProgress({
								bytesUploaded: totalBytes,
								totalBytes: totalBytes,
								percentage: 100,
							});
						}
					}),
				),
				Stream.runDrain,
			);

			// Upload to S3
			const buffer = Buffer.concat(chunks);
			const command = new PutObjectCommand({
				Bucket: self.bucket,
				Key: key,
				Body: buffer,
				ContentType: contentType,
				Metadata: {
					uploadedAt: new Date().toISOString(),
					size: buffer.length.toString(),
				},
			});

			yield* Effect.tryPromise({
				try: () => self.client.send(command),
				catch: (error) => new StorageStreamError('upload', key, error),
			});

			const url = yield* self.generatePresignedUrl(key, 7 * 24 * 60 * 60);

			return {
				key,
				url,
				size: totalBytes,
			};
		});
	}

	downloadStream(
		key: string,
		onProgress?: (progress: DownloadProgress) => void,
	) {
		const self = this;
		return Stream.fromEffect(
			Effect.gen(function* () {
				// Get object metadata first
				const metadata = yield* self.getMetadata(key);

				const command = new GetObjectCommand({
					Bucket: self.bucket,
					Key: key,
				});

				const response = yield* Effect.tryPromise({
					try: () => self.client.send(command),
					catch: (error) => {
						if (
							error &&
							typeof error === 'object' &&
							'name' in error &&
							error.name === 'NoSuchKey'
						) {
							return new StorageNotFoundError(key);
						}
						return new StorageStreamError('download', key, error);
					},
				});

				if (!response.Body) {
					return yield* Effect.fail(new StorageNotFoundError(key));
				}

				let bytesDownloaded = 0;
				const totalBytes = metadata.size;

				// Convert the response body to a stream
				const nodeStream = response.Body as Readable;

				return Stream.fromAsyncIterable(
					nodeStream,
					(error) => new StorageStreamError('download', key, error),
				).pipe(
					Stream.map((chunk) => new Uint8Array(chunk)),
					Stream.tap((chunk) =>
						Effect.sync(() => {
							bytesDownloaded += chunk.length;
							if (onProgress) {
								onProgress({
									bytesDownloaded,
									totalBytes,
									percentage: totalBytes
										? Math.round((bytesDownloaded / totalBytes) * 100)
										: undefined,
								});
							}
						}),
					),
				);
			}),
		).pipe(Stream.flatten());
	}

	uploadFile(
		key: string,
		filePath: string,
		contentType?: string,
		onProgress?: (progress: UploadProgress) => void,
	) {
		const self = this;
		return Effect.gen(function* () {
			const fileStream = yield* Effect.try(() =>
				createReadStream(filePath),
			).pipe(
				Effect.mapError(
					(error) => new StorageStreamError('upload', key, error),
				),
			);

			const stream = Stream.fromAsyncIterable(
				fileStream,
				(error) => new StorageStreamError('upload', key, error),
			).pipe(
				Stream.map((chunk: any) => new Uint8Array(chunk)),
			) as Stream.Stream<Uint8Array, never, never>;

			return yield* self.uploadStream(key, stream, contentType, onProgress);
		});
	}

	downloadFile(
		key: string,
		filePath: string,
		onProgress?: (progress: DownloadProgress) => void,
	) {
		const self = this;
		return Effect.gen(function* () {
			// Ensure directory exists
			yield* Effect.tryPromise({
				try: () => mkdir(dirname(filePath), { recursive: true }),
				catch: (error) => new StorageStreamError('download', key, error),
			});

			const writeStream = yield* Effect.try(() =>
				createWriteStream(filePath),
			).pipe(
				Effect.mapError(
					(error) => new StorageStreamError('download', key, error),
				),
			);

			const downloadStream = self.downloadStream(key, onProgress);

			// Simple approach: collect all chunks and write
			const chunks: Buffer[] = [];
			yield* downloadStream.pipe(
				Stream.tap((chunk) =>
					Effect.sync(() => {
						chunks.push(Buffer.from(chunk as any));
					}),
				),
				Stream.runDrain,
			);

			// Write all chunks to file
			yield* Effect.tryPromise({
				try: () =>
					new Promise<void>((resolve, reject) => {
						let written = 0;
						const writeNext = () => {
							if (written >= chunks.length) {
								writeStream.end();
								resolve();
								return;
							}
							const ok = writeStream.write(chunks[written]);
							written++;
							if (!ok) {
								writeStream.once('drain', writeNext);
							} else {
								writeNext();
							}
						};
						writeStream.on('error', reject);
						writeNext();
					}),
				catch: (error) => new StorageStreamError('download', key, error),
			});
		});
	}

	uploadLarge(
		key: string,
		stream: Stream.Stream<Uint8Array, never, never>,
		contentType?: string,
		partSize: number = 5 * 1024 * 1024, // 5MB default part size
		onProgress?: (progress: UploadProgress) => void,
	) {
		const self = this;
		return Effect.gen(function* () {
			// For now, fall back to regular upload
			// In production, implement multipart upload using CreateMultipartUpload, UploadPart, CompleteMultipartUpload
			return yield* self.uploadStream(
				key,
				stream as Stream.Stream<Uint8Array, never, never>,
				contentType,
				onProgress,
			);
		});
	}

	generatePresignedUrl(key: string, expiresInSeconds: number = 3600) {
		const self = this;
		return Effect.tryPromise({
			try: async () => {
				const command = new GetObjectCommand({
					Bucket: self.bucket,
					Key: key,
				});
				return await getSignedUrl(self.client, command, {
					expiresIn: expiresInSeconds,
				});
			},
			catch: (error) => new StorageStreamError('presignedUrl', key, error),
		});
	}

	exists(key: string) {
		const self = this;
		return Effect.gen(function* () {
			try {
				yield* self.getMetadata(key);
				return true;
			} catch {
				return false;
			}
		});
	}

	getMetadata(key: string) {
		const self = this;
		return Effect.tryPromise({
			try: async () => {
				const command = new HeadObjectCommand({
					Bucket: self.bucket,
					Key: key,
				});
				const response = await self.client.send(command);
				return {
					size: response.ContentLength || 0,
					contentType: response.ContentType,
					lastModified: response.LastModified,
				};
			},
			catch: (error) => {
				if (
					error &&
					typeof error === 'object' &&
					'name' in error &&
					error.name === 'NotFound'
				) {
					return new StorageNotFoundError(key);
				}
				return new StorageStreamError('metadata', key, error);
			},
		});
	}

	delete(key: string) {
		const self = this;
		return Effect.tryPromise({
			try: async () => {
				const command = new DeleteObjectCommand({
					Bucket: self.bucket,
					Key: key,
				});
				await self.client.send(command);
			},
			catch: (error) => new StorageStreamError('delete', key, error),
		});
	}
}

// Local file system implementation
class LocalStorageStreamServiceImpl {
	private storagePath: string;

	constructor(storagePath: string = './storage') {
		this.storagePath = storagePath;
	}

	uploadStream(
		key: string,
		stream: Stream.Stream<Uint8Array, never, never>,
		contentType?: string,
		onProgress?: (progress: UploadProgress) => void,
	) {
		const self = this;
		return Effect.gen(function* () {
			const filePath = join(self.storagePath, key);
			yield* Effect.tryPromise({
				try: () => mkdir(dirname(filePath), { recursive: true }),
				catch: (error) => new StorageStreamError('upload', key, error),
			});

			let totalBytes = 0;
			const chunks: Uint8Array[] = [];

			yield* stream.pipe(
				Stream.tap((chunk) =>
					Effect.sync(() => {
						chunks.push(chunk);
						totalBytes += chunk.length;
						if (onProgress) {
							onProgress({
								bytesUploaded: totalBytes,
								totalBytes: totalBytes,
								percentage: 100,
							});
						}
					}),
				),
				Stream.runDrain,
			);

			const buffer = Buffer.concat(chunks);
			const writeStream = createWriteStream(filePath);

			yield* Effect.tryPromise({
				try: () =>
					new Promise<void>((resolve, reject) => {
						writeStream.on('error', reject);
						writeStream.on('finish', () => resolve());
						writeStream.write(buffer);
						writeStream.end();
					}),
				catch: (error) => new StorageStreamError('upload', key, error),
			});

			return {
				key,
				url: `file://${filePath}`,
				size: totalBytes,
			};
		});
	}

	downloadStream(
		key: string,
		onProgress?: (progress: DownloadProgress) => void,
	) {
		const filePath = join(this.storagePath, key);

		return Stream.fromEffect(
			Effect.gen(function* () {
				const readStream = yield* Effect.try(() =>
					createReadStream(filePath),
				).pipe(
					Effect.mapError((error) => {
						if (
							error &&
							typeof error === 'object' &&
							'code' in error &&
							error.code === 'ENOENT'
						) {
							return new StorageNotFoundError(key);
						}
						return new StorageStreamError('download', key, error);
					}),
				);

				return Stream.fromAsyncIterable(
					readStream,
					(error) => new StorageStreamError('download', key, error),
				).pipe(Stream.map((chunk: any) => new Uint8Array(chunk)));
			}),
		).pipe(Stream.flatten());
	}

	uploadFile(
		key: string,
		filePath: string,
		contentType?: string,
		onProgress?: (progress: UploadProgress) => void,
	) {
		const self = this;
		return self.uploadStream(
			key,
			Stream.fromAsyncIterable(
				createReadStream(filePath),
				(error) => new StorageStreamError('upload', key, error),
			).pipe(
				Stream.map((chunk: any) => new Uint8Array(chunk)),
			) as Stream.Stream<Uint8Array, never, never>,
			contentType,
			onProgress,
		);
	}

	downloadFile(
		key: string,
		filePath: string,
		onProgress?: (progress: DownloadProgress) => void,
	) {
		const sourcePath = join(this.storagePath, key);
		return Effect.gen(function* () {
			yield* Effect.tryPromise({
				try: () => mkdir(dirname(filePath), { recursive: true }),
				catch: (error) => new StorageStreamError('download', key, error),
			});

			const readStream = createReadStream(sourcePath);
			const writeStream = createWriteStream(filePath);

			yield* Effect.tryPromise({
				try: () => pipeline(readStream, writeStream),
				catch: (error) => {
					if (
						error &&
						typeof error === 'object' &&
						'code' in error &&
						error.code === 'ENOENT'
					) {
						return new StorageNotFoundError(key);
					}
					return new StorageStreamError('download', key, error);
				},
			});
		});
	}

	uploadLarge(
		key: string,
		stream: Stream.Stream<Uint8Array, never, never>,
		contentType?: string,
		partSize?: number,
		onProgress?: (progress: UploadProgress) => void,
	) {
		// Local storage doesn't need multipart
		return this.uploadStream(key, stream, contentType, onProgress);
	}

	generatePresignedUrl(key: string, expiresInSeconds?: number) {
		const filePath = join(this.storagePath, key);
		return Effect.succeed(`file://${filePath}`);
	}

	exists(key: string) {
		const filePath = join(this.storagePath, key);
		return Effect.tryPromise({
			try: async () => {
				const fs = await import('fs/promises');
				await fs.access(filePath);
				return true;
			},
			catch: () => false,
		});
	}

	getMetadata(key: string) {
		const filePath = join(this.storagePath, key);
		return Effect.tryPromise({
			try: async () => {
				const fs = await import('fs/promises');
				const stats = await fs.stat(filePath);
				return {
					size: stats.size,
					contentType: undefined,
					lastModified: stats.mtime,
				};
			},
			catch: (error) => {
				if (
					error &&
					typeof error === 'object' &&
					'code' in error &&
					error.code === 'ENOENT'
				) {
					return new StorageNotFoundError(key);
				}
				return new StorageStreamError('metadata', key, error);
			},
		});
	}

	delete(key: string) {
		const filePath = join(this.storagePath, key);
		return Effect.tryPromise({
			try: () => unlink(filePath),
			catch: (error) => new StorageStreamError('delete', key, error),
		});
	}
}

// Create layer with retry logic
const createStorageServiceWithRetry = (impl: any) => {
	const retrySchedule = pipe(
		Schedule.exponential(Duration.seconds(1), 2),
		Schedule.either(Schedule.recurs(3)),
	);

	return StorageStreamService.of({
		uploadStream: (key, stream, contentType, onProgress) =>
			impl
				.uploadStream(key, stream, contentType, onProgress)
				.pipe(Effect.retry(retrySchedule)),

		downloadStream: (key, onProgress) => impl.downloadStream(key, onProgress),

		uploadFile: (key, filePath, contentType, onProgress) =>
			impl
				.uploadFile(key, filePath, contentType, onProgress)
				.pipe(Effect.retry(retrySchedule)),

		downloadFile: (key, filePath, onProgress) =>
			impl
				.downloadFile(key, filePath, onProgress)
				.pipe(Effect.retry(retrySchedule)),

		uploadLarge: (key, stream, contentType, partSize, onProgress) =>
			impl
				.uploadLarge(key, stream, contentType, partSize, onProgress)
				.pipe(Effect.retry(retrySchedule)),

		generatePresignedUrl: (key, expiresInSeconds) =>
			impl
				.generatePresignedUrl(key, expiresInSeconds)
				.pipe(Effect.retry(retrySchedule)),

		exists: (key) => impl.exists(key),

		getMetadata: (key) => impl.getMetadata(key),

		delete: (key) => impl.delete(key).pipe(Effect.retry(retrySchedule)),
	});
};

// Export layers
export const StorageStreamServiceLive = Layer.succeed(
	StorageStreamService,
	createStorageServiceWithRetry(
		config.STORAGE_TYPE === 'local'
			? new LocalStorageStreamServiceImpl()
			: new S3StorageStreamServiceImpl(),
	),
);

// Helper functions for common operations
export const uploadWithProgress = (
	key: string,
	data: Buffer,
	contentType?: string,
) =>
	Effect.gen(function* () {
		const storage = yield* StorageStreamService;
		const stream = Stream.make(new Uint8Array(data));

		let lastProgress = 0;
		return yield* storage.uploadStream(key, stream, contentType, (progress) => {
			const rounded = Math.round(progress.percentage / 10) * 10;
			if (rounded > lastProgress) {
				console.log(`Upload progress: ${rounded}%`);
				lastProgress = rounded;
			}
		});
	});

export const downloadWithProgress = (key: string) =>
	Effect.gen(function* () {
		const storage = yield* StorageStreamService;
		const chunks: Uint8Array[] = [];

		let lastProgress = 0;
		yield* storage
			.downloadStream(key, (progress) => {
				if (progress.percentage) {
					const rounded = Math.round(progress.percentage / 10) * 10;
					if (rounded > lastProgress) {
						console.log(`Download progress: ${rounded}%`);
						lastProgress = rounded;
					}
				}
			})
			.pipe(
				Stream.tap((chunk) => Effect.sync(() => chunks.push(chunk))),
				Stream.runDrain,
			);

		return Buffer.concat(chunks);
	});
