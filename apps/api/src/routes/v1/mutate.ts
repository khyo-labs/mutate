import { DatabaseService, StorageService, transformBuffer } from '@mutate/core';
import { Effect, pipe } from 'effect';
import type { FastifyInstance, FastifyRequest } from 'fastify';

import { effectHandler, serializeError } from '@/effect/adapters/fastify.js';
import { transformationQueue } from '@/services/queue.js';

interface MutateRequestBody {
	file?: {
		data: string; // Base64 encoded
		name: string;
	};
	async?: boolean;
	uid?: string;
	callbackUrl?: string;
}

interface MutateParams {
	mutationId: string;
}

/**
 * Effect-based mutation endpoint
 * This demonstrates how to migrate an API route to use Effect
 */
export async function mutateRoutes(app: FastifyInstance) {
	app.addHook('preHandler', app.authenticate);

	// Synchronous transformation using Effect
	app.post<{
		Params: MutateParams;
		Body: MutateRequestBody;
	}>(
		'/:mutationId',
		{
			schema: {
				params: {
					type: 'object',
					properties: {
						mutationId: { type: 'string' },
					},
					required: ['mutationId'],
				},
				body: {
					type: ['object', 'null'],
					// properties: {
					// 	file: {
					// 		type: 'object',
					// 		properties: {
					// 			data: { type: 'string' },
					// 			name: { type: 'string' },
					// 		},
					// 		required: ['data', 'name'],
					// 	},
					// 	async: { type: 'boolean' },
					// 	uid: { type: 'string' },
					// 	callbackUrl: { type: 'string' },
					// },
				},
			},
		},
		effectHandler(
			(req) =>
				Effect.gen(function* () {
					const database = yield* DatabaseService;

					const { mutationId } = req.params;
					const contentType = req.headers['content-type'] || '';
					const userId = req.currentUser?.id;

					if (!userId) {
						return yield* Effect.fail({
							code: 'NOT_AUTHENTICATED',
							message: 'Authentication required',
						});
					}

					let fileBuffer: Buffer;
					let fileName: string;
					let uid: string | undefined;
					let callbackUrl: string | undefined;
					let isAsync: boolean | undefined;

					if (contentType.startsWith('multipart/')) {
						const data = yield* Effect.tryPromise({
							try: () => (req as any).file(),
							catch: (error) => ({
								code: 'FILE_UPLOAD_ERROR',
								message: String(error),
							}),
						});

						if (!data) {
							return yield* Effect.fail({
								code: 'MISSING_FILE',
								message: 'File is required',
							});
						}

						const multipartData = data as any;

						// Read file stream
						fileBuffer = yield* Effect.tryPromise({
							try: async () => {
								const chunks: Buffer[] = [];
								for await (const chunk of multipartData.file) chunks.push(chunk);
								return Buffer.concat(chunks);
							},
							catch: (error) => ({
								code: 'STREAM_ERROR',
								message: String(error),
							}),
						});

						fileName = multipartData.filename || 'upload';

						// Extract extra fields from multipart form data
						// The fields object contains all non-file form fields
						const fields = multipartData.fields as any;
						uid = fields?.uid?.value;
						callbackUrl = fields?.callbackUrl?.value;
						isAsync = fields?.async?.value === 'true';
					} else {
						// ✅ handle JSON (base64)
						const {
							file,
							async: asyncFlag,
							uid: u,
							callbackUrl: cb,
						} = (req.body || {}) as MutateRequestBody;

						if (!file || !file.data || !file.name) {
							return yield* Effect.fail({
								code: 'MISSING_FILE',
								message: 'File data is required',
							});
						}

						fileBuffer = Buffer.from(file.data, 'base64');
						fileName = file.name;
						isAsync = asyncFlag;
						uid = u;
						callbackUrl = cb;
					}

					// Get the configuration
					const config = yield* database.getConfiguration(mutationId).pipe(
						Effect.mapError((error) => ({
							code: 'CONFIGURATION_NOT_FOUND',
							message: `Configuration ${mutationId} not found`,
						})),
					);

					if (!callbackUrl) {
						callbackUrl = config.callbackUrl;
					}

					// Always create job in database
					const jobId = yield* database.createJob(
						config.organizationId,
						config.id,
						fileName,
						userId,
					);

					// Determine if we should queue the job
					// Queue if explicitly requested as async OR if callback URL is provided
					const shouldQueue = isAsync === true || callbackUrl !== undefined;

					if (shouldQueue) {
						// Queue the job
						yield* Effect.tryPromise({
							try: () =>
								transformationQueue.add('mutate-file', {
									jobId,
									organizationId: config.organizationId,
									configurationId: config.id,
									fileData: fileBuffer.toString('base64'),
									fileName,
									conversionType: config.conversionType as 'XLSX_TO_CSV' | 'DOCX_TO_PDF',
									callbackUrl: callbackUrl,
									uid,
									options: {},
								}),
							catch: (error) => ({
								code: 'QUEUE_ERROR',
								message: 'Failed to queue transformation job',
							}),
						});

						return {
							jobId,
							status: 'queued',
							message: 'Transformation job has been queued',
						};
					}

					// Synchronous transformation (only if not queued)
					yield* database.updateJobStatus(jobId, 'processing', {
						startedAt: new Date(),
					});

					const result = yield* transformBuffer(fileBuffer, config).pipe(
						Effect.tapError(() =>
							database.updateJobStatus(jobId, 'failed', {
								completedAt: new Date(),
							}),
						),
						Effect.mapError((error) => ({
							code: 'TRANSFORMATION_ERROR',
							message: serializeError(error),
						})),
					);

					yield* database.updateJobStatus(jobId, 'completed', {
						completedAt: new Date(),
						executionLog: result.executionLog,
					});

					return {
						success: true,
						data: result.csvData,
						executionLog: result.executionLog,
					};
				}),
			{
				onSuccess: (data) => ({
					status: 200,
					body: data,
				}),
				onError: (error) => ({
					status: 400,
					body: {
						success: false,
						error: error,
					},
				}),
			},
		),
	);

	// Get job status using Effect
	app.get<{
		Params: { mutationId: string; jobId: string };
	}>(
		'/:mutationId/jobs/:jobId',
		{
			schema: {
				params: {
					type: 'object',
					properties: {
						mutationId: { type: 'string' },
						jobId: { type: 'string' },
					},
					required: ['mutationId', 'jobId'],
				},
			},
		},
		effectHandler(
			(req: FastifyRequest<{ Params: { mutationId: string; jobId: string } }>) =>
				Effect.gen(function* () {
					const database = yield* DatabaseService;
					const storage = yield* StorageService;
					const { jobId } = req.params;

					const job = yield* database.getJob(jobId).pipe(
						Effect.mapError(() => ({
							code: 'JOB_NOT_FOUND',
							message: `Job ${jobId} not found`,
						})),
					);

					// If job is completed, generate a fresh download URL
					let downloadUrl: string | undefined;
					if (job.status === 'completed' && job.metadata?.outputFileKey) {
						downloadUrl = yield* storage
							.signGet(job.metadata.outputFileKey, 3600)
							.pipe(Effect.orElse(() => Effect.succeed(job.metadata?.downloadUrl)));
					}

					return {
						jobId: job.id,
						status: job.status,
						fileName: job.fileName,
						downloadUrl,
						error: job.metadata?.error,
						executionLog: job.metadata?.executionLog,
						createdAt: job.metadata?.startedAt,
						completedAt: job.metadata?.completedAt,
					};
				}),
			{
				onSuccess: (data) => ({
					status: 200,
					body: { success: true, data },
				}),
				onError: (error) => ({
					status: 404,
					body: {
						success: false,
						error: error,
					},
				}),
			},
		),
	);

	// Download transformed file using Effect
	app.post<{
		Params: { mutationId: string; jobId: string };
	}>(
		'/:mutationId/jobs/:jobId/download',
		{
			schema: {
				params: {
					type: 'object',
					properties: {
						mutationId: { type: 'string' },
						jobId: { type: 'string' },
					},
					required: ['mutationId', 'jobId'],
				},
			},
		},
		effectHandler(
			(req: FastifyRequest<{ Params: { mutationId: string; jobId: string } }>) =>
				Effect.gen(function* () {
					const database = yield* DatabaseService;
					const storage = yield* StorageService;
					const { jobId } = req.params;

					const job = yield* database.getJob(jobId);

					if (job.status !== 'completed') {
						return yield* Effect.fail({
							code: 'JOB_NOT_READY',
							message: `Job ${jobId} is not completed yet`,
						});
					}

					if (!job.metadata?.outputFileKey) {
						return yield* Effect.fail({
							code: 'FILE_NOT_FOUND',
							message: 'Output file not found',
						});
					}

					// Generate a fresh presigned URL
					const downloadUrl = yield* storage.signGet(job.metadata.outputFileKey, 3600);

					return {
						downloadUrl,
						fileName: job.fileName.replace(/\.[^.]+$/, '.csv'),
						expiresIn: 3600,
					};
				}),
			{
				onSuccess: (data) => ({
					status: 200,
					body: { success: true, data },
				}),
				onError: (error) => ({
					status: 400,
					body: {
						success: false,
						error: error,
					},
				}),
			},
		),
	);
}
