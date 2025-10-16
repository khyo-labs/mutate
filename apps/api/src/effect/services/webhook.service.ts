import { createHash, createHmac } from 'crypto';
import { eq } from 'drizzle-orm';
import {
	Context,
	Duration,
	Effect,
	Layer,
	Option,
	Schedule,
	pipe,
} from 'effect';

import { config } from '@/config.js';
import { db } from '@/db/connection.js';
import {
	configurations,
	organizationWebhooks,
	webhookDeliveries,
} from '@/db/schema.js';
import { webhookDeliveryQueue } from '@/services/queue.js';

export interface WebhookPayload {
	jobId: string;
	status: 'completed' | 'failed';
	configurationId: string;
	organizationId: string;
	uid?: string;
	downloadUrl?: string;
	expiresAt?: string;
	executionLog?: string[];
	error?: string;
	completedAt: string;
	fileSize?: number;
	originalFileName?: string;
}

export interface WebhookDelivery {
	id: string;
	url: string;
	payload: WebhookPayload;
	status: 'pending' | 'success' | 'failed';
	attempts: number;
	lastAttempt?: Date;
	nextAttempt?: Date;
	responseStatus?: number;
	responseBody?: string;
	error?: string;
}

export class WebhookValidationError {
	readonly _tag = 'WebhookValidationError';
	constructor(readonly message: string) {}
}

export class WebhookDeliveryError {
	readonly _tag = 'WebhookDeliveryError';
	constructor(
		readonly message: string,
		readonly statusCode?: number,
		readonly responseBody?: string,
	) {}
}

export class WebhookTimeoutError {
	readonly _tag = 'WebhookTimeoutError';
	constructor(readonly message: string) {}
}

export class WebhookService extends Context.Tag('WebhookService')<
	WebhookService,
	{
		readonly sendWebhook: (
			url: string,
			payload: WebhookPayload,
			secret?: string,
		) => Effect.Effect<WebhookDelivery, WebhookDeliveryError>;
		readonly sendWebhookWithPriority: (
			organizationId: string,
			configurationId: string,
			payload: WebhookPayload,
			transformCallbackUrl?: string,
		) => Effect.Effect<Option.Option<WebhookDelivery>, never>;
		readonly validateWebhookUrl: (
			url: string,
		) => Effect.Effect<void, WebhookValidationError>;
		readonly verifySignature: (
			payload: string,
			signature: string,
			secret: string,
		) => Effect.Effect<boolean, never>;
		readonly createJobCompletedPayload: (
			jobData: {
				jobId: string;
				configurationId: string;
				organizationId: string;
				status: 'completed' | 'failed';
				uid?: string;
				downloadUrl?: string;
				executionLog?: string[];
				error?: string;
				fileSize?: number;
				originalFileName?: string;
			},
			expiresAt?: Date,
		) => WebhookPayload;
	}
>() {}

const sha256 = (input: string): string =>
	createHash('sha256').update(input).digest('hex');

const buildIdempotencyKey = (input: {
	organizationId: string;
	configurationId: string;
	eventType: string;
	jobId: string;
	targetUrl: string;
}): string => {
	const basis = `${input.organizationId}:${input.configurationId}:${input.eventType}:${input.jobId}:${input.targetUrl}`;
	return sha256(basis);
};

const generateSignature = (payload: string, secret: string): string =>
	createHmac('sha256', secret).update(payload).digest('hex');

const makeHttpRequest = (
	url: string,
	payload: WebhookPayload,
	secret?: string,
	timeout: number = 30000,
) =>
	Effect.gen(function* () {
		const body = JSON.stringify(payload);
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			'User-Agent': 'Mutate-Webhook/1.0',
			'X-Webhook-Event': 'transformation.completed',
		};

		if (secret) {
			const signature = generateSignature(body, secret);
			headers['mutate-signature'] = `sha256=${signature}`;
		}

		const ts = Math.floor(Date.now() / 1000).toString();
		headers['X-Mutate-Timestamp'] = ts;
		headers['X-Mutate-Id'] = payload.jobId;

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		try {
			const response = yield* Effect.tryPromise({
				try: () =>
					fetch(url, {
						method: 'POST',
						headers,
						body,
						signal: controller.signal,
					}),
				catch: (error) => {
					if (error instanceof Error && error.name === 'AbortError') {
						return new WebhookDeliveryError(
							`Request timeout after ${timeout}ms`,
						);
					}
					return new WebhookDeliveryError(
						error instanceof Error ? error.message : 'Unknown error',
					);
				},
			});

			const responseBody = yield* Effect.tryPromise({
				try: () => response.text(),
				catch: () => new WebhookDeliveryError('Failed to read response body'),
			});

			clearTimeout(timeoutId);

			if (response.status >= 200 && response.status < 300) {
				return { status: response.status, body: responseBody };
			}

			return yield* Effect.fail(
				new WebhookDeliveryError(
					`HTTP ${response.status}: ${responseBody}`,
					response.status,
					responseBody,
				),
			);
		} finally {
			clearTimeout(timeoutId);
		}
	});

const validateWebhookUrl = (url: string) =>
	Effect.gen(function* () {
		try {
			const urlObj = new URL(url);

			if (!['http:', 'https:'].includes(urlObj.protocol)) {
				return yield* Effect.fail(
					new WebhookValidationError(
						'Webhook URL must use HTTP or HTTPS protocol',
					),
				);
			}

			const nodeEnv = process.env.NODE_ENV || 'development';
			if (
				nodeEnv === 'production' &&
				(urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1')
			) {
				return yield* Effect.fail(
					new WebhookValidationError(
						'Localhost URLs are not allowed in production',
					),
				);
			}
		} catch {
			return yield* Effect.fail(
				new WebhookValidationError('Invalid URL format'),
			);
		}
	});

const verifySignature = (payload: string, signature: string, secret: string) =>
	Effect.sync(() => {
		const expectedSignature = createHmac('sha256', secret)
			.update(payload)
			.digest('hex');

		const providedSignature = signature.replace('sha256=', '');

		if (providedSignature.length !== expectedSignature.length) {
			return false;
		}

		let result = 0;
		for (let i = 0; i < expectedSignature.length; i++) {
			result |=
				expectedSignature.charCodeAt(i) ^ providedSignature.charCodeAt(i);
		}

		return result === 0;
	});

const createJobCompletedPayload = (
	jobData: {
		jobId: string;
		configurationId: string;
		organizationId: string;
		status: 'completed' | 'failed';
		uid?: string;
		downloadUrl?: string;
		executionLog?: string[];
		error?: string;
		fileSize?: number;
		originalFileName?: string;
	},
	expiresAt?: Date,
): WebhookPayload => ({
	jobId: jobData.jobId,
	status: jobData.status,
	configurationId: jobData.configurationId,
	organizationId: jobData.organizationId,
	uid: jobData.uid,
	downloadUrl: jobData.downloadUrl,
	expiresAt: expiresAt?.toISOString(),
	executionLog: jobData.executionLog,
	error: jobData.error,
	completedAt: new Date().toISOString(),
	fileSize: jobData.fileSize,
	originalFileName: jobData.originalFileName,
});

const sendWebhook = (
	url: string,
	payload: WebhookPayload,
	secret?: string,
	maxRetries: number = 5,
	timeout: number = 30000,
): Effect.Effect<WebhookDelivery, WebhookDeliveryError> =>
	Effect.gen(function* () {
		const delivery: WebhookDelivery = {
			id: `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			url,
			payload,
			status: 'pending',
			attempts: 0,
		};

		const retrySchedule = Schedule.exponential(Duration.seconds(1), 2).pipe(
			Schedule.either(Schedule.recurs(maxRetries - 1)),
		);

		const result = yield* pipe(
			makeHttpRequest(url, payload, secret, timeout),
			Effect.tap((response) =>
				Effect.sync(() => {
					delivery.responseStatus = response.status;
					delivery.responseBody = response.body;
					delivery.status = 'success';
					delivery.attempts++;
					delivery.lastAttempt = new Date();
					console.log(`Webhook delivered successfully: ${delivery.id}`, {
						url: delivery.url,
						jobId: delivery.payload.jobId,
						attempts: delivery.attempts,
						status: response.status,
					});
				}),
			),
			Effect.retry(retrySchedule),
			Effect.tapError((error) =>
				Effect.sync(() => {
					delivery.status = 'failed';
					delivery.error =
						error instanceof WebhookDeliveryError
							? error.message
							: 'Unknown error';
					console.error(`Webhook delivery failed: ${delivery.id}`, {
						url: delivery.url,
						jobId: delivery.payload.jobId,
						attempts: delivery.attempts,
						error: delivery.error,
					});
				}),
			),
			Effect.as(delivery),
		);

		return result;
	});

const sendWebhookWithPriority = (
	organizationId: string,
	configurationId: string,
	payload: WebhookPayload,
	transformCallbackUrl?: string,
): Effect.Effect<Option.Option<WebhookDelivery>, never, never> =>
	Effect.gen(function* () {
		const configuration = yield* Effect.tryPromise(() =>
			db.query.configurations.findFirst({
				where: eq(configurations.id, configurationId),
				columns: {
					callbackUrl: true,
					webhookUrlId: true,
				},
				with: {
					webhookUrl: {
						columns: {
							id: true,
							name: true,
							url: true,
							secret: true,
						},
					},
				},
			}),
		).pipe(
			Effect.catchAll((error) => {
				console.error('Failed to fetch configuration:', error);
				return Effect.succeed(null);
			}),
		);

		const createDeliveryRecord = (targetUrl: string, webhookUrlId?: string) =>
			Effect.gen(function* () {
				const idempotencyKey = buildIdempotencyKey({
					organizationId,
					configurationId,
					eventType: 'transformation.completed',
					jobId: payload.jobId,
					targetUrl,
				});

				const payloadHash = sha256(JSON.stringify(payload));
				const id = `wh_${Date.now()}_${Math.random()
					.toString(36)
					.slice(2, 10)}`;

				yield* Effect.tryPromise(() =>
					db
						.insert(webhookDeliveries)
						.values({
							id,
							organizationId,
							configurationId,
							targetUrl,
							webhookUrlId: webhookUrlId || null,
							eventType: 'transformation.completed',
							idempotencyKey,
							payload: payload as any,
							payloadHash,
							status: 'pending',
							attempts: 0,
						})
						.onConflictDoNothing(),
				).pipe(
					Effect.catchAll((error) => {
						console.error('Failed to create delivery record:', error);
						return Effect.succeed(undefined);
					}),
				);

				yield* Effect.tryPromise(() =>
					webhookDeliveryQueue.add(
						'deliver-webhook',
						{ deliveryId: id },
						{ jobId: id },
					),
				).pipe(
					Effect.catchAll((error) => {
						console.error('Failed to queue webhook delivery:', error);
						return Effect.succeed(undefined);
					}),
				);

				return {
					id,
					url: targetUrl,
					payload,
					status: 'pending' as const,
					attempts: 0,
				} as WebhookDelivery;
			});

		// Priority 1: Transform request callback URL
		if (transformCallbackUrl) {
			const validation = yield* validateWebhookUrl(transformCallbackUrl).pipe(
				Effect.either,
			);

			if (validation._tag === 'Right') {
				console.log(`Using transform callback URL for job ${payload.jobId}`);
				const delivery = yield* createDeliveryRecord(transformCallbackUrl);
				return Option.some(delivery);
			} else {
				console.error(
					`Invalid transform callback URL: ${validation.left.message}`,
				);
			}
		}

		// Priority 2: Configuration-selected org webhook URL
		if (configuration?.webhookUrl) {
			const validation = yield* validateWebhookUrl(
				configuration.webhookUrl.url,
			).pipe(Effect.either);

			if (validation._tag === 'Right') {
				console.log(
					`Using configuration-selected webhook ${configuration.webhookUrl.name} for job ${payload.jobId}`,
				);

				yield* Effect.tryPromise(() =>
					db
						.update(organizationWebhooks)
						.set({ lastUsedAt: new Date() })
						.where(eq(organizationWebhooks.id, configuration.webhookUrl!.id)),
				).pipe(Effect.catchAll(() => Effect.succeed(undefined)));

				const delivery = yield* createDeliveryRecord(
					configuration.webhookUrl.url,
					configuration.webhookUrl.id,
				);
				return Option.some(delivery);
			}
		}

		// Priority 3: Legacy configuration callback URL
		if (configuration?.callbackUrl) {
			const validation = yield* validateWebhookUrl(
				configuration.callbackUrl,
			).pipe(Effect.either);

			if (validation._tag === 'Right') {
				console.log(
					`Using configuration callback URL for job ${payload.jobId}`,
				);
				const delivery = yield* createDeliveryRecord(
					configuration.callbackUrl,
					configuration?.webhookUrlId || undefined,
				);
				return Option.some(delivery);
			}
		}

		console.log(
			`No webhook configured for organization ${organizationId}, configuration ${configurationId}`,
		);
		return Option.none();
	});

export const WebhookServiceLive = Layer.succeed(
	WebhookService,
	WebhookService.of({
		sendWebhook: (url, payload, secret) =>
			sendWebhook(
				url,
				payload,
				secret,
				config.WEBHOOK_MAX_RETRIES || 5,
				config.WEBHOOK_TIMEOUT || 30000,
			),
		sendWebhookWithPriority,
		validateWebhookUrl,
		verifySignature,
		createJobCompletedPayload,
	}),
);
