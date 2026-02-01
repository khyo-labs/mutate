import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ulid } from 'ulid';

import { config } from '@/config.js';

export interface StorageProvider {
	uploadFile(key: string, buffer: Buffer, contentType: string): Promise<string>;
	generatePresignedUrl(key: string, expiresIn: number): Promise<string>;
	deleteFile(key: string): Promise<boolean>;
}

export interface UploadResult {
	key: string;
	url: string;
	size: number;
}

class S3StorageProvider implements StorageProvider {
	private client: S3Client;
	private bucket: string;

	constructor(
		accessKeyId: string,
		secretAccessKey: string,
		region: string,
		bucket: string,
		endpoint?: string,
	) {
		this.client = new S3Client({
			region,
			credentials: {
				accessKeyId,
				secretAccessKey,
			},
			...(endpoint && { endpoint }),
			forcePathStyle: !!endpoint, // Required for R2 and other S3-compatible services
		});
		this.bucket = bucket;
	}

	async uploadFile(key: string, buffer: Buffer, contentType: string): Promise<string> {
		const command = new PutObjectCommand({
			Bucket: this.bucket,
			Key: key,
			Body: buffer,
			ContentType: contentType,
			Metadata: {
				uploadedAt: new Date().toISOString(),
				size: buffer.length.toString(),
			},
		});

		await this.client.send(command);
		return key;
	}

	async generatePresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
		const command = new GetObjectCommand({
			Bucket: this.bucket,
			Key: key,
		});

		const presignedUrl = await getSignedUrl(this.client, command, {
			expiresIn,
		});
		return presignedUrl;
	}

	async deleteFile(key: string): Promise<boolean> {
		try {
			const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
			const command = new DeleteObjectCommand({
				Bucket: this.bucket,
				Key: key,
			});
			await this.client.send(command);
			return true;
		} catch (error) {
			console.error(`Failed to delete file ${key}:`, error);
			return false;
		}
	}
}

class LocalStorageProvider implements StorageProvider {
	private storagePath: string;

	constructor(storagePath: string) {
		this.storagePath = storagePath;
	}

	async uploadFile(key: string, buffer: Buffer, contentType: string): Promise<string> {
		const fs = await import('fs/promises');
		const path = await import('path');

		const filePath = path.join(this.storagePath, key);
		const directory = path.dirname(filePath);

		// Ensure directory exists
		await fs.mkdir(directory, { recursive: true });

		// Write file
		await fs.writeFile(filePath, buffer);

		return key;
	}

	async generatePresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
		// For local storage, return a direct URL (in production, you'd want a proper signed URL system)
		// This is just for development/testing
		const encodedKey = encodeURIComponent(key);
		return `${config.API_BASE_URL || 'http://localhost:3000'}/v1/files/${encodedKey}?expires=${Date.now() + expiresIn * 1000}`;
	}

	async deleteFile(key: string): Promise<boolean> {
		try {
			const fs = await import('fs/promises');
			const path = await import('path');
			const filePath = path.join(this.storagePath, key);
			await fs.unlink(filePath);
			return true;
		} catch (error) {
			console.error(`Failed to delete local file ${key}:`, error);
			return false;
		}
	}
}

export class StorageService {
	private provider: StorageProvider;

	constructor() {
		this.provider = this.createProvider();
	}

	private createProvider(): StorageProvider {
		switch (config.STORAGE_TYPE) {
			case 's3':
				if (config.CLOUDFLARE_R2_ACCESS_KEY_ID && config.CLOUDFLARE_R2_SECRET_ACCESS_KEY) {
					// Use Cloudflare R2
					return new S3StorageProvider(
						config.CLOUDFLARE_R2_ACCESS_KEY_ID,
						config.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
						config.CLOUDFLARE_R2_REGION || 'auto',
						config.CLOUDFLARE_R2_BUCKET!,
						config.CLOUDFLARE_R2_ENDPOINT,
					);
				} else if (config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY) {
					// Use AWS S3
					return new S3StorageProvider(
						config.AWS_ACCESS_KEY_ID,
						config.AWS_SECRET_ACCESS_KEY,
						config.AWS_REGION!,
						config.AWS_S3_BUCKET!,
					);
				} else {
					throw new Error('S3 storage type selected but no credentials provided');
				}

			case 'local':
			default:
				return new LocalStorageProvider(config.STORAGE_PATH);
		}
	}

	async uploadTransformedFile(
		buffer: Buffer,
		originalFileName: string,
		organizationId: string,
		jobId: string,
	): Promise<UploadResult> {
		const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
		const fileId = ulid();
		const extension = this.getFileExtension(originalFileName);

		// Create a structured key for organization
		const key = `transformed/${organizationId}/${timestamp}/${jobId}/${fileId}.${extension}`;

		const contentType = this.getContentType(extension);

		await this.provider.uploadFile(key, buffer, contentType);

		// Generate an initial presigned URL (valid for configured FILE_TTL)
		const url = await this.provider.generatePresignedUrl(key, config.FILE_TTL);

		return {
			key,
			url,
			size: buffer.length,
		};
	}

	async uploadInputFile(
		buffer: Buffer,
		fileName: string,
		organizationId: string,
		jobId: string,
	): Promise<UploadResult> {
		const timestamp = new Date().toISOString().slice(0, 10);
		const fileId = ulid();
		const extension = this.getFileExtension(fileName);

		const key = `input/${organizationId}/${timestamp}/${jobId}/${fileId}.${extension}`;
		const contentType = this.getContentType(extension);

		await this.provider.uploadFile(key, buffer, contentType);
		const url = await this.provider.generatePresignedUrl(key, config.FILE_TTL);

		return {
			key,
			url,
			size: buffer.length,
		};
	}

	async generateFreshPresignedUrl(
		key: string,
		expiresIn: number = config.FILE_TTL,
	): Promise<string> {
		return await this.provider.generatePresignedUrl(key, expiresIn);
	}

	async deleteFile(key: string): Promise<boolean> {
		return await this.provider.deleteFile(key);
	}

	private getFileExtension(fileName: string): string {
		const match = fileName.match(/\.([^.]+)$/);
		return match ? match[1].toLowerCase() : 'bin';
	}

	private getContentType(extension: string): string {
		const contentTypeMap: Record<string, string> = {
			csv: 'text/csv',
			xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			xls: 'application/vnd.ms-excel',
			json: 'application/json',
			txt: 'text/plain',
			pdf: 'application/pdf',
		};

		return contentTypeMap[extension] || 'application/octet-stream';
	}

	// Utility method to extract key from full URL (for cleanup operations)
	static extractKeyFromUrl(url: string): string | null {
		try {
			const urlObj = new URL(url);
			// For presigned URLs, the key is typically in the pathname
			let pathname = urlObj.pathname;

			// Remove leading slash and decode
			if (pathname.startsWith('/')) {
				pathname = pathname.slice(1);
			}

			return decodeURIComponent(pathname);
		} catch (error) {
			console.error('Failed to extract key from URL:', error);
			return null;
		}
	}
}

// Create singleton instance
export const storageService = new StorageService();
