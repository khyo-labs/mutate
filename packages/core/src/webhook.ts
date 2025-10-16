import { Duration, Effect, Schedule } from 'effect';

import { WebhookError } from './errors.js';
import { LoggerService } from './services/logger.js';

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

export function deliverWebhook(
	url: string,
	payload: WebhookPayload,
	secret?: string,
) {
	return Effect.gen(function* () {
		const logger = yield* LoggerService;

		yield* logger.info(`Delivering webhook to ${url}`, {
			jobId: payload.jobId,
			status: payload.status,
		});

		const body = JSON.stringify(payload);

		// For now, use fetch directly until we set up @effect/platform properly
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			'User-Agent': 'Mutate/1.0',
		};

		// Add signature if secret provided
		if (secret) {
			try {
				const crypto = require('crypto');
				const signature = crypto
					.createHmac('sha256', secret)
					.update(body)
					.digest('hex');
				headers['Mutate-Signature'] = signature;
			} catch {
				// Crypto not available, skip signature
			}
		}

		const response = yield* Effect.tryPromise({
			try: async () => {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 30000);

				try {
					const res = await fetch(url, {
						method: 'POST',
						headers,
						body,
						signal: controller.signal,
					});

					clearTimeout(timeoutId);
					return res;
				} catch (error) {
					clearTimeout(timeoutId);
					throw error;
				}
			},
			catch: (error) =>
				new WebhookError({
					url,
					body: error,
				}),
		});

		if (response.ok) {
			yield* logger.info(`Webhook delivered successfully`, {
				url,
				status: response.status,
				jobId: payload.jobId,
			});
			return { delivered: true, status: response.status };
		}

		const errorBody = yield* Effect.tryPromise({
			try: () => response.text(),
			catch: () => null,
		});
		return yield* Effect.fail(
			new WebhookError({
				url,
				status: response.status,
				body: errorBody,
			}),
		);
	}).pipe(
		Effect.retry(
			Schedule.exponential(Duration.seconds(1), 2).pipe(
				Schedule.compose(Schedule.recurs(5)),
				Schedule.jittered,
			),
		),
	);
}
