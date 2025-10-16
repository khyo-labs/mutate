import {
	DatabaseService,
	StorageService,
	TransformError,
	transformBuffer,
} from '@mutate/core';
import { Duration, Effect, Option, pipe } from 'effect';

import { effectBullProcessor, reportProgress } from '@/effect/adapters/bull.js';
import { runtime } from '@/effect/runtime.js';
import { WebhookService } from '@/effect/services/webhook.service.js';
import { type QueueJobData, transformationQueue } from '@/services/queue.js';

const isTransformError = (error: unknown): error is TransformError =>
	error instanceof TransformError;

/**
 * Process a mutation job using Effect
 */
const processMutationJob = (data: QueueJobData, job: any) =>
	Effect.gen(function* () {
		const database = yield* DatabaseService;
		const storage = yield* StorageService;
		const webhookService = yield* WebhookService;

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
			Effect.tapError((error: unknown) =>
				database.updateJobStatus(jobId, 'failed', {
					error: isTransformError(error)
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

		// Send webhook using the new priority-based system
		const webhookPayload = webhookService.createJobCompletedPayload(
			{
				jobId,
				status: 'completed',
				configurationId,
				organizationId,
				uid,
				downloadUrl: outputResult.url,
				executionLog: transformResult.executionLog,
				fileSize: outputBuffer.length,
				originalFileName: fileName,
			},
			new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
		);

		const webhookResult = yield* webhookService.sendWebhookWithPriority(
			organizationId,
			configurationId,
			webhookPayload,
			callbackUrl,
		);

		if (Option.isSome(webhookResult)) {
			console.log(`Webhook queued for job ${jobId}`);
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
		Effect.catchAll((error: unknown) => {
			// Capture variables in closure scope
			const errorJobId = data.jobId;
			const errorOrgId = data.organizationId;
			const errorConfigId = data.configurationId;
			const errorFileName = data.fileName;
			const errorCallbackUrl = data.callbackUrl;
			const errorUid = data.uid;

			return Effect.gen(function* () {
				const database = yield* DatabaseService;
				const webhookService = yield* WebhookService;

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
					const webhookPayload = webhookService.createJobCompletedPayload({
						jobId: errorJobId,
						status: 'failed',
						configurationId: errorConfigId,
						organizationId: errorOrgId,
						uid: errorUid,
						error:
							error instanceof Error ? error.message : 'Job processing failed',
						originalFileName: errorFileName,
					});

					yield* webhookService
						.sendWebhookWithPriority(
							errorOrgId,
							errorConfigId,
							webhookPayload,
							errorCallbackUrl,
						)
						.pipe(Effect.ignore);
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
