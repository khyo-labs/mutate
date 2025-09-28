import { DatabaseService, StorageService, transformBuffer } from '@mutate/core';
import { Effect, pipe } from 'effect';
import type { FastifyInstance, FastifyRequest } from 'fastify';

import {
	effectHandler,
	serializeError,
} from '../../effect/adapters/fastify.js';
import { transformationQueue } from '../../services/queue.js';

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
export default async function mutateEffectRoutes(app: FastifyInstance) {
	// Synchronous transformation using Effect
	app.post<{
		Params: MutateParams;
		Body: MutateRequestBody;
	}>(
		'/v1/effect/mutate/:mutationId',
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
					type: 'object',
					properties: {
						file: {
							type: 'object',
							properties: {
								data: { type: 'string' },
								name: { type: 'string' },
							},
							required: ['data', 'name'],
						},
						async: { type: 'boolean' },
						uid: { type: 'string' },
						callbackUrl: { type: 'string' },
					},
				},
			},
		},
		effectHandler(
			(
				req: FastifyRequest<{ Params: MutateParams; Body: MutateRequestBody }>,
			) =>
				Effect.gen(function* () {
					const database = yield* DatabaseService;
					const { mutationId } = req.params;
					const { file, async: isAsync, uid, callbackUrl } = req.body;

					if (!file) {
						return yield* Effect.fail({
							code: 'MISSING_FILE',
							message: 'File data is required',
						});
					}

					// Get the configuration
					const config = yield* database.getConfiguration(mutationId).pipe(
						Effect.mapError((error) => ({
							code: 'CONFIGURATION_NOT_FOUND',
							message: `Configuration ${mutationId} not found`,
						})),
					);

					const fileBuffer = Buffer.from(file.data, 'base64');

					// If async, queue the job
					if (isAsync) {
						// Create job in database
						const jobId = yield* database.createJob(
							config.organizationId,
							config.id,
							file.name,
						);

						// Queue the job
						yield* Effect.tryPromise({
							try: () =>
								transformationQueue.add('mutate-file', {
									jobId,
									organizationId: config.organizationId,
									configurationId: config.id,
									fileData: file.data,
									fileName: file.name,
									conversionType: config.conversionType as
										| 'XLSX_TO_CSV'
										| 'DOCX_TO_PDF',
									callbackUrl,
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

					// Synchronous transformation
					const result = yield* transformBuffer(fileBuffer, config).pipe(
						Effect.mapError((error) => ({
							code: 'TRANSFORMATION_ERROR',
							message: serializeError(error),
						})),
					);

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
		'/v1/effect/mutate/:mutationId/jobs/:jobId',
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
			(
				req: FastifyRequest<{ Params: { mutationId: string; jobId: string } }>,
			) =>
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
							.pipe(
								Effect.orElse(() => Effect.succeed(job.metadata?.downloadUrl)),
							);
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
		'/v1/effect/mutate/:mutationId/jobs/:jobId/download',
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
			(
				req: FastifyRequest<{ Params: { mutationId: string; jobId: string } }>,
			) =>
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
					const downloadUrl = yield* storage.signGet(
						job.metadata.outputFileKey,
						3600,
					);

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
