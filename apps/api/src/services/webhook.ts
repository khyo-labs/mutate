import { createHmac } from 'crypto';
import { and, eq } from 'drizzle-orm';

import { config } from '../config.js';
import { db } from '../db/connection.js';
import { configurations, organizationWebhooks } from '../db/schema.js';

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

class WebhookService {
	private readonly maxRetries = config.WEBHOOK_MAX_RETRIES || 5;
	private readonly timeout = config.WEBHOOK_TIMEOUT || 30000; // 30 seconds
	private readonly secret = config.WEBHOOK_SECRET;

	async sendWebhook(
		url: string,
		payload: WebhookPayload,
		secret?: string,
	): Promise<WebhookDelivery> {
		const delivery: WebhookDelivery = {
			id: `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			url,
			payload,
			status: 'pending',
			attempts: 0,
		};

		await this.attemptDelivery(delivery, secret);
		return delivery;
	}

	async attemptDelivery(
		delivery: WebhookDelivery,
		secret?: string,
	): Promise<void> {
		delivery.attempts++;
		delivery.lastAttempt = new Date();

		try {
			const response = await this.makeHttpRequest(
				delivery.url,
				delivery.payload,
				secret,
			);

			delivery.responseStatus = response.status;
			delivery.responseBody = response.body;

			if (response.status >= 200 && response.status < 300) {
				delivery.status = 'success';
				console.log(`Webhook delivered successfully: ${delivery.id}`, {
					url: delivery.url,
					jobId: delivery.payload.jobId,
					attempts: delivery.attempts,
					status: response.status,
				});
			} else {
				throw new Error(`HTTP ${response.status}: ${response.body}`);
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error';
			delivery.error = errorMessage;

			console.error(`Webhook delivery failed: ${delivery.id}`, {
				url: delivery.url,
				jobId: delivery.payload.jobId,
				attempts: delivery.attempts,
				error: errorMessage,
			});

			if (delivery.attempts < this.maxRetries) {
				// Calculate exponential backoff: 2^attempt * 1000ms (1s, 2s, 4s, 8s, 16s)
				const delayMs = Math.pow(2, delivery.attempts) * 1000;
				delivery.nextAttempt = new Date(Date.now() + delayMs);
				delivery.status = 'pending';

				console.log(`Webhook will retry in ${delayMs}ms: ${delivery.id}`, {
					nextAttempt: delivery.nextAttempt,
				});

				// Schedule retry
				setTimeout(() => {
					this.attemptDelivery(delivery, secret);
				}, delayMs);
			} else {
				delivery.status = 'failed';
				console.error(`Webhook delivery exhausted retries: ${delivery.id}`, {
					url: delivery.url,
					jobId: delivery.payload.jobId,
					totalAttempts: delivery.attempts,
				});
			}
		}
	}

	private async makeHttpRequest(
		url: string,
		payload: WebhookPayload,
		secret?: string,
	): Promise<{
		status: number;
		body: string;
	}> {
		const body = JSON.stringify(payload);
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			'User-Agent': 'Mutate-Webhook/1.0',
			'X-Webhook-Event': 'transformation.completed',
		};

		console.log('secret', secret);

		if (secret) {
			const signature = this.generateSignature(body, secret);
			headers['x-mutate-signature'] = `sha256=${signature}`;
		}

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.timeout);

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers,
				body,
				signal: controller.signal,
			});

			const responseBody = await response.text();

			return {
				status: response.status,
				body: responseBody,
			};
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				throw new Error(`Request timeout after ${this.timeout}ms`);
			}
			throw error;
		} finally {
			clearTimeout(timeoutId);
		}
	}

	private generateSignature(payload: string, secret: string): string {
		return createHmac('sha256', secret).update(payload).digest('hex');
	}

	// Utility method to verify webhook signatures (for webhook receivers)
	static verifySignature(
		payload: string,
		signature: string,
		secret: string,
	): boolean {
		const expectedSignature = createHmac('sha256', secret)
			.update(payload)
			.digest('hex');

		// Use constant-time comparison to prevent timing attacks
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
	}

	// Send webhook using priority system:
	// 1. Transform request callbackUrl (highest priority)
	// 2. Configuration-selected org webhook URL
	// 3. Return the file in the response if no webhook configured
	async sendWebhookWithPriority(
		organizationId: string,
		configurationId: string,
		payload: WebhookPayload,
		transformCallbackUrl?: string,
	): Promise<WebhookDelivery | null> {
		try {
			// Get configuration and its selected webhook (if any)
			const configuration = await db.query.configurations.findFirst({
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
			});

			// Determine which webhook secret to use for external callbacks
			const secret = configuration?.webhookUrl?.secret || undefined;

			// Priority 1: Use transform request callback URL if provided
			if (transformCallbackUrl) {
				console.log(`Using transform callback URL for job ${payload.jobId}`);
				const validation =
					WebhookService.validateWebhookUrl(transformCallbackUrl);
				if (validation.valid) {
					return await this.sendWebhook(transformCallbackUrl, payload, secret);
				} else {
					console.error(`Invalid transform callback URL: ${validation.error}`);
				}
			}

			// Priority 2: Check configuration for selected org webhook URL
			if (configuration?.webhookUrl) {
				console.log(
					`Using configuration-selected webhook ${configuration.webhookUrl.name} for job ${payload.jobId}`,
				);
				const validation = WebhookService.validateWebhookUrl(
					configuration.webhookUrl.url,
				);
				if (validation.valid) {
					// Update lastUsedAt for the webhook
					await db
						.update(organizationWebhooks)
						.set({ lastUsedAt: new Date() })
						.where(eq(organizationWebhooks.id, configuration.webhookUrl.id));

					return await this.sendWebhook(
						configuration.webhookUrl.url,
						payload,
						configuration.webhookUrl.secret || undefined,
					);
				} else {
					console.error(
						`Invalid configuration webhook URL: ${validation.error}`,
					);
				}
			}

			// Legacy fallback: Use configuration callback URL if no webhook URL selected
			if (configuration?.callbackUrl) {
				console.log(
					`Using configuration callback URL for job ${payload.jobId}`,
				);
				const validation = WebhookService.validateWebhookUrl(
					configuration.callbackUrl,
				);
				if (validation.valid) {
					return await this.sendWebhook(
						configuration.callbackUrl,
						payload,
						secret,
					);
				} else {
					console.error(
						`Invalid configuration callback URL: ${validation.error}`,
					);
				}
			}

			// No webhook configuration found - file will be returned in response
			console.log(
				`No webhook configured for organization ${organizationId}, configuration ${configurationId}`,
			);
			return null;
		} catch (error) {
			console.error(
				`Failed to send webhook for organization ${organizationId}:`,
				error,
			);
			return null;
		}
	}

	// Helper method to create webhook payload
	static createJobCompletedPayload(
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
	): WebhookPayload {
		return {
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
		};
	}

	// Validate webhook URL format
	static validateWebhookUrl(url: string): { valid: boolean; error?: string } {
		try {
			const urlObj = new URL(url);

			// Must be HTTP or HTTPS
			if (!['http:', 'https:'].includes(urlObj.protocol)) {
				return {
					valid: false,
					error: 'Webhook URL must use HTTP or HTTPS protocol',
				};
			}

			// Must not be localhost in production
			if (
				config.NODE_ENV === 'production' &&
				(urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1')
			) {
				return {
					valid: false,
					error: 'Localhost URLs are not allowed in production',
				};
			}

			return { valid: true };
		} catch (error) {
			return {
				valid: false,
				error: 'Invalid URL format',
			};
		}
	}
}

export const webhookService = new WebhookService();

// Export the class for testing purposes
export { WebhookService };
