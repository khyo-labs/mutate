import { createHmac } from 'crypto';
import { eq } from 'drizzle-orm';
import { Duration, Effect, Option, Schedule, pipe } from 'effect';

import { config } from '@/config.js';
import { db } from '@/db/connection.js';
import { organizationWebhooks, webhookDeliveries } from '@/db/schema.js';
import { effectBullProcessor, reportProgress } from '@/effect/adapters/bull.js';
import { runtime } from '@/effect/runtime.js';
import {
	type WebhookPayload,
	WebhookService,
} from '@/effect/services/webhook.service.js';
import {
	type WebhookDeliveryJobData,
	webhookDeadLetterQueue,
	webhookDeliveryQueue,
} from '@/services/queue.js';

const MAX_RETRIES = config.WEBHOOK_MAX_RETRIES || 5;
const TIMEOUT_MS = config.WEBHOOK_TIMEOUT || 30000;

/**
 * Process a webhook delivery job using Effect and WebhookService
 */
const processWebhookDelivery = (data: WebhookDeliveryJobData, job: any) =>
	Effect.gen(function* () {
		const webhookService = yield* WebhookService;
		const { deliveryId } = data;

		console.log(`[Effect Webhook Worker] Processing delivery ${deliveryId}`);

		// Fetch the delivery record from database with related data
		const delivery = yield* Effect.tryPromise(() =>
			db.query.webhookDeliveries.findFirst({
				where: eq(webhookDeliveries.id, deliveryId),
				with: {
					configuration: {
						columns: { webhookUrlId: true },
					},
				},
			}),
		).pipe(
			Effect.mapError((error) => ({
				code: 'DB_ERROR',
				message: `Failed to fetch delivery ${deliveryId}`,
				cause: error,
			})),
		);

		if (!delivery) {
			console.error(`[Effect Webhook Worker] Delivery ${deliveryId} not found`);
			return { delivered: false, error: 'Delivery not found' };
		}

		// Track attempt
		const currentAttempt = (delivery.attempts || 0) + 1;
		yield* reportProgress(job, 20);

		// Resolve secret from organization webhook if present
		let secret: string | undefined;
		if (delivery.webhookUrlId) {
			const orgWebhook = yield* Effect.tryPromise(() =>
				db.query.organizationWebhooks.findFirst({
					where: eq(organizationWebhooks.id, delivery.webhookUrlId!),
					columns: { secret: true },
				}),
			).pipe(Effect.catchAll(() => Effect.succeed(null)));
			secret = orgWebhook?.secret || undefined;
		}

		// Update delivery status to in progress
		const startedAt = new Date();
		yield* Effect.tryPromise(() =>
			db
				.update(webhookDeliveries)
				.set({
					attempts: currentAttempt,
					lastAttempt: startedAt,
					updatedAt: new Date(),
				})
				.where(eq(webhookDeliveries.id, deliveryId)),
		).pipe(
			Effect.mapError(() => ({
				code: 'DB_ERROR',
				message: 'Failed to update delivery status',
			})),
			Effect.catchAll(() => Effect.succeed(undefined)), // Continue even if update fails
		);
		yield* reportProgress(job, 40);

		// Build webhook payload from stored data
		const webhookPayload = delivery.payload as WebhookPayload;

		// Attempt delivery using the WebhookService with retry
		const retrySchedule = pipe(
			Schedule.exponential(Duration.seconds(1), 2),
			Schedule.either(Schedule.recurs(currentAttempt < MAX_RETRIES ? 2 : 0)),
			Schedule.compose(Schedule.elapsed),
		);

		const deliveryResult = yield* webhookService
			.sendWebhook(delivery.targetUrl, webhookPayload, secret)
			.pipe(
				Effect.timeout(Duration.millis(TIMEOUT_MS)),
				Effect.tap(() =>
					Effect.gen(function* () {
						// Success! Update delivery status
						yield* Effect.tryPromise(() =>
							db
								.update(webhookDeliveries)
								.set({
									status: 'success',
									responseStatus: 200,
									attempts: currentAttempt,
									lastAttempt: startedAt,
									updatedAt: new Date(),
									signature: secret
										? createHmac('sha256', secret)
												.update(JSON.stringify(webhookPayload))
												.digest('hex')
										: undefined,
									signedAt: secret ? startedAt : undefined,
									nextAttempt: null,
									error: null,
								})
								.where(eq(webhookDeliveries.id, deliveryId)),
						).pipe(Effect.orElse(() => Effect.succeed(undefined)));

						yield* reportProgress(job, 100);

						console.log(
							`[Effect Webhook Worker] Delivery ${deliveryId} completed successfully`,
						);
					}),
				),
				Effect.catchAll((error) =>
					Effect.gen(function* () {
						const errorMessage =
							error && typeof error === 'object' && 'message' in error
								? String(error.message)
								: 'Unknown error';

						console.error(
							`[Effect Webhook Worker] Delivery ${deliveryId} failed:`,
							errorMessage,
						);

						// Check if we should retry
						if (currentAttempt >= MAX_RETRIES) {
							// Max retries exceeded, move to DLQ
							console.error(
								`[Effect Webhook Worker] Max retries exceeded for ${deliveryId}, moving to DLQ`,
							);

							// Update status to failed/dead
							yield* Effect.tryPromise(() =>
								db
									.update(webhookDeliveries)
									.set({
										status: 'dead',
										attempts: currentAttempt,
										lastAttempt: startedAt,
										error: errorMessage,
										nextAttempt: null,
										updatedAt: new Date(),
									})
									.where(eq(webhookDeliveries.id, deliveryId)),
							).pipe(Effect.orElse(() => Effect.succeed(undefined)));

							// Add to dead letter queue
							yield* Effect.tryPromise(() =>
								webhookDeadLetterQueue.add(
									'dead',
									{ deliveryId },
									{ jobId: deliveryId },
								),
							).pipe(Effect.orElse(() => Effect.succeed(undefined)));

							// Don't re-throw - let job complete to prevent Bull retry
							return {
								delivered: false,
								movedToDLQ: true,
								error: errorMessage,
								status: 'failed',
								attempts: currentAttempt,
							};
						}

						// Calculate next retry time using exponential backoff
						const nextRetryAt = new Date(
							Date.now() + Math.pow(2, currentAttempt) * 1000,
						);

						// Update delivery with error and next retry time
						yield* Effect.tryPromise(() =>
							db
								.update(webhookDeliveries)
								.set({
									status: 'pending',
									attempts: currentAttempt,
									lastAttempt: startedAt,
									error: errorMessage,
									nextAttempt: nextRetryAt,
									updatedAt: new Date(),
								})
								.where(eq(webhookDeliveries.id, deliveryId)),
						).pipe(Effect.orElse(() => Effect.succeed(undefined)));

						yield* reportProgress(job, 80);

						// Re-throw to let Bull handle retry
						return yield* Effect.fail(
							new Error(`HTTP delivery failed: ${errorMessage}`),
						);
					}),
				),
			);

		return deliveryResult;
	}).pipe(
		Effect.withSpan('processWebhookDelivery', {
			attributes: { deliveryId: data.deliveryId },
		}),
	);

/**
 * Process failed deliveries from DLQ (for manual inspection/retry)
 */
const processDLQDelivery = (data: WebhookDeliveryJobData) =>
	Effect.gen(function* () {
		const { deliveryId } = data;

		console.log(
			`[Effect Webhook Worker] Processing DLQ delivery ${deliveryId} for inspection`,
		);

		// Fetch the delivery record
		const delivery = yield* Effect.tryPromise(() =>
			db.query.webhookDeliveries.findFirst({
				where: eq(webhookDeliveries.id, deliveryId),
			}),
		).pipe(Effect.orElse(() => Effect.succeed(null)));

		if (!delivery) {
			return { inspected: false, error: 'Record not found' };
		}

		// Log for manual inspection/alerting
		console.error('[DLQ Inspector] Failed webhook delivery:', {
			deliveryId: delivery.id,
			organizationId: delivery.organizationId,
			configurationId: delivery.configurationId,
			targetUrl: delivery.targetUrl,
			attempts: delivery.attempts,
			lastError: delivery.error,
			payload: delivery.payload,
		});

		// Could send to monitoring/alerting system here
		// Could also attempt manual retry with different logic
		// For example, retry with longer timeout or different endpoint

		return {
			inspected: true,
			deliveryId: delivery.id,
			organizationId: delivery.organizationId,
			targetUrl: delivery.targetUrl,
			attempts: delivery.attempts,
			error: delivery.error,
		};
	}).pipe(Effect.withSpan('processDLQDelivery'));

/**
 * Reprocess a DLQ delivery with modified settings
 */
const reprocessDLQDelivery = (
	deliveryId: string,
	options?: {
		alternateUrl?: string;
		extendedTimeout?: number;
		maxRetries?: number;
	},
) =>
	Effect.gen(function* () {
		const webhookService = yield* WebhookService;

		// Fetch the delivery record
		const delivery = yield* Effect.tryPromise(() =>
			db.query.webhookDeliveries.findFirst({
				where: eq(webhookDeliveries.id, deliveryId),
			}),
		).pipe(
			Effect.mapError(() => ({
				code: 'NOT_FOUND',
				message: 'Delivery not found',
			})),
		);

		if (!delivery) {
			return yield* Effect.fail({
				code: 'NOT_FOUND',
				message: 'Delivery not found in DLQ',
			});
		}

		// Reset status to pending for reprocessing
		yield* Effect.tryPromise(() =>
			db
				.update(webhookDeliveries)
				.set({
					status: 'pending',
					attempts: 0,
					error: null,
					nextAttempt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(webhookDeliveries.id, deliveryId)),
		).pipe(Effect.orElse(() => Effect.succeed(undefined)));

		// Re-queue for processing with custom options
		yield* Effect.tryPromise(() =>
			webhookDeliveryQueue.add(
				'deliver-webhook',
				{
					deliveryId,
					...options,
				},
				{
					jobId: `retry-${deliveryId}-${Date.now()}`,
					attempts: options?.maxRetries || 3,
					backoff: {
						type: 'exponential',
						delay: 2000,
					},
				},
			),
		);

		return {
			requeued: true,
			deliveryId,
			options,
		};
	});

/**
 * Initialize the webhook delivery worker
 */
function initializeWebhookWorker() {
	console.log(
		'[Effect Webhook Worker] Initializing webhook delivery worker with Effect processor',
	);

	// Process webhook deliveries
	webhookDeliveryQueue.process(
		'deliver-webhook',
		effectBullProcessor(processWebhookDelivery),
	);

	// Process DLQ items (for inspection/manual retry)
	webhookDeadLetterQueue.process(
		'dead',
		effectBullProcessor(processDLQDelivery),
	);

	// Handle shutdown gracefully
	process.on('SIGTERM', async () => {
		console.log(
			'[Effect Webhook Worker] Received SIGTERM, shutting down gracefully...',
		);
		await webhookDeliveryQueue.close();
		await webhookDeadLetterQueue.close();
		await runtime.dispose();
		process.exit(0);
	});

	process.on('SIGINT', async () => {
		console.log(
			'[Effect Webhook Worker] Received SIGINT, shutting down gracefully...',
		);
		await webhookDeliveryQueue.close();
		await webhookDeadLetterQueue.close();
		await runtime.dispose();
		process.exit(0);
	});

	console.log(
		'[Effect Webhook Worker] Worker initialized and ready to process webhook deliveries',
	);
}

// Initialize the worker when this module is imported
initializeWebhookWorker();

export { initializeWebhookWorker, reprocessDLQDelivery };
