import {
	DatabaseService,
	StorageService,
	TransformError,
	type WebhookPayload,
	deliverWebhook,
	transformBuffer,
} from '@mutate/core';
import { eq } from 'drizzle-orm';
import { Duration, Effect, pipe } from 'effect';

import { db } from '../db/connection.js';
import { organizationWebhooks } from '../db/schema.js';
import {
	effectBullProcessor,
	reportProgress,
} from '../effect/adapters/bull.js';
import { runtime } from '../effect/runtime.js';
import { type QueueJobData, transformationQueue } from '../services/queue.js';

/**
 * Process a mutation job using Effect
 */
const processMutationJob = (data: QueueJobData, job: any) =>
	Effect.gen(function* () {
		const database = yield* DatabaseService;
		const storage = yield* StorageService;

		// Convert base64 string back to Buffer
		const fileBuffer = Buffer.from(data.fileData, 'base64');
		const {
			jobId,
			organizationId,
			configurationId,
			fileName,
			callbackUrl,
			uid,
		} = data;

		console.log(`[Effect Worker] Processing job ${jobId}`, {
			organizationId,
			configurationId,
			fileName,
			bufferSize: fileBuffer.length,
		});

		// Update job status to processing
		yield* database.updateJobStatus(jobId, 'processing', {
			startedAt: new Date(),
		});
		yield* reportProgress(job, 10);

		// Get configuration
		const config = yield* database.getConfiguration(configurationId).pipe(
			Effect.tapError(() =>
				database.updateJobStatus(jobId, 'failed', {
					error: `Configuration ${configurationId} not found`,
					completedAt: new Date(),
				}),
			),
		);
		yield* reportProgress(job, 20);

		// Upload input file if not local storage
		let inputFileResult;
		if (process.env.STORAGE_TYPE !== 'local') {
			const inputKey = `input/${organizationId}/${jobId}/${fileName}`;
			inputFileResult = yield* storage.upload(
				inputKey,
				fileBuffer,
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			);

			yield* database.updateJobStatus(jobId, 'processing', {
				inputFileUrl: inputFileResult.url,
				inputFileKey: inputFileResult.key,
				originalFileName: fileName,
				fileSize: fileBuffer.length,
			});
		}
		yield* reportProgress(job, 30);

		// Transform the file
		const transformResult = yield* transformBuffer(fileBuffer, config).pipe(
			Effect.tapError((error) =>
				database.updateJobStatus(jobId, 'failed', {
					error:
						error instanceof TransformError
							? error.reason
							: 'Transformation failed',
					completedAt: new Date(),
					executionLog: [],
				}),
			),
		);
		yield* reportProgress(job, 70);

		// Upload the transformed file
		const outputFileName = fileName.replace(/\.[^.]+$/, '.csv');
		const outputKey = `transformed/${organizationId}/${jobId}/${outputFileName}`;
		const outputBuffer = Buffer.from(transformResult.csvData || '');

		const outputResult = yield* storage.upload(
			outputKey,
			outputBuffer,
			'text/csv',
		);
		yield* reportProgress(job, 90);

		// Update job as completed
		yield* database.updateJobStatus(jobId, 'completed', {
			outputFileUrl: outputResult.url,
			outputFileKey: outputResult.key,
			completedAt: new Date(),
			executionLog: transformResult.executionLog,
			fileSize: outputBuffer.length,
		});

		// Send webhook if configured
		if (callbackUrl) {
			const webhookPayload: WebhookPayload = {
				jobId,
				status: 'completed',
				configurationId,
				organizationId,
				uid,
				downloadUrl: outputResult.url,
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
				executionLog: transformResult.executionLog,
				completedAt: new Date().toISOString(),
				fileSize: outputBuffer.length,
				originalFileName: fileName,
			};

			yield* deliverWebhook(callbackUrl, webhookPayload).pipe(
				Effect.tapError((error) =>
					Effect.sync(() => console.error('Failed to deliver webhook:', error)),
				),
				Effect.ignore, // Don't fail the job if webhook fails
			);
		}

		// Check for organization-wide webhooks
		const [orgWebhook] = yield* Effect.tryPromise({
			try: () =>
				db
					.select()
					.from(organizationWebhooks)
					.where(eq(organizationWebhooks.organizationId, organizationId))
					.limit(1),
			catch: () => new Error('Failed to fetch organization webhook'),
		}).pipe(Effect.orElse(() => Effect.succeed([])));

		if (orgWebhook?.url) {
			const webhookPayload: WebhookPayload = {
				jobId,
				status: 'completed',
				configurationId,
				organizationId,
				uid,
				downloadUrl: outputResult.url,
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
				executionLog: transformResult.executionLog,
				completedAt: new Date().toISOString(),
				fileSize: outputBuffer.length,
				originalFileName: fileName,
			};

			yield* deliverWebhook(
				orgWebhook.url,
				webhookPayload,
				orgWebhook.secret || undefined,
			).pipe(
				Effect.tapError((error) =>
					Effect.sync(() =>
						console.error('Failed to deliver org webhook:', error),
					),
				),
				Effect.ignore,
			);
		}

		yield* reportProgress(job, 100);

		console.log(`[Effect Worker] Job ${jobId} completed successfully`);

		return {
			success: true,
			downloadUrl: outputResult.url,
			executionLog: transformResult.executionLog,
		};
	}).pipe(
		Effect.timeout(Duration.minutes(5)),
		Effect.catchAll((error) => {
			// Capture variables in closure scope
			const errorJobId = data.jobId;
			const errorOrgId = data.organizationId;
			const errorConfigId = data.configurationId;
			const errorFileName = data.fileName;
			const errorCallbackUrl = data.callbackUrl;
			const errorUid = data.uid;

			return Effect.gen(function* () {
				const database = yield* DatabaseService;

				console.error(`[Effect Worker] Job ${errorJobId} failed:`, error);

				// Update job status to failed
				yield* database
					.updateJobStatus(errorJobId, 'failed', {
						error: error instanceof Error ? error.message : 'Unknown error',
						completedAt: new Date(),
					})
					.pipe(Effect.ignore);

				// Send failure webhook if configured
				if (errorCallbackUrl) {
					const webhookPayload: WebhookPayload = {
						jobId: errorJobId,
						status: 'failed',
						configurationId: errorConfigId,
						organizationId: errorOrgId,
						uid: errorUid,
						error:
							error instanceof Error ? error.message : 'Job processing failed',
						completedAt: new Date().toISOString(),
						originalFileName: errorFileName,
					};

					yield* deliverWebhook(errorCallbackUrl, webhookPayload).pipe(
						Effect.ignore,
					);
				}

				// Re-throw to let Bull handle retry
				return yield* Effect.fail(error);
			});
		}),
		Effect.withSpan('processMutationJob'),
	);

/**
 * Initialize the worker with Effect processor
 */
function initializeEffectWorker() {
	console.log(
		'[Effect Worker] Initializing mutation worker with Effect processor',
	);

	// Process jobs using the Effect adapter
	transformationQueue.process(
		'mutate-file',
		effectBullProcessor(processMutationJob),
	);

	// Handle shutdown gracefully
	process.on('SIGTERM', async () => {
		console.log(
			'[Effect Worker] Received SIGTERM, shutting down gracefully...',
		);
		await transformationQueue.close();
		await runtime.dispose();
		process.exit(0);
	});

	process.on('SIGINT', async () => {
		console.log('[Effect Worker] Received SIGINT, shutting down gracefully...');
		await transformationQueue.close();
		await runtime.dispose();
		process.exit(0);
	});

	console.log('[Effect Worker] Worker initialized and ready to process jobs');
}

// Initialize the worker when this module is imported
initializeEffectWorker();

export { initializeEffectWorker };
