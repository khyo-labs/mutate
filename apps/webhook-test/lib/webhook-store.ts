import { createHmac } from 'crypto';

export interface WebhookData {
	id: string;
	timestamp: string;
	method: string;
	path: string;
	headers: Record<string, any>;
	body: any;
	query: Record<string, any>;
	attemptCount: number;
	signature?: string;
	hmacValid: boolean | null;
	event?: string;
	ip?: string;
	jobId?: string;
	status?: string;
	uid?: string;
	processingTime: number;
}

export interface Config {
	responseStatus: number;
	responseDelay: number;
	failAfterAttempts: number;
	attemptCounts: Map<string, number>;
	simulateTimeout: boolean;
	requireSignature: boolean;
	expectedSignature: string;
	webhookSecret: string;
	verifyHmac: boolean;
	returnCustomBody: boolean;
	customBody: any;
}

class WebhookStore {
	private webhooks: WebhookData[] = [];
	private config: Config = {
		responseStatus: 200,
		responseDelay: 0,
		failAfterAttempts: 0,
		attemptCounts: new Map(),
		simulateTimeout: false,
		requireSignature: false,
		expectedSignature: '',
		webhookSecret: process.env.WEBHOOK_SECRET || 'test-secret-key',
		verifyHmac: false,
		returnCustomBody: false,
		customBody: { message: 'OK' },
	};
	addWebhook(webhook: WebhookData) {
		this.webhooks.unshift(webhook);
		if (this.webhooks.length > 100) {
			this.webhooks.pop();
		}
	}

	getWebhooks(limit = 10, offset = 0) {
		return {
			total: this.webhooks.length,
			limit,
			offset,
			webhooks: this.webhooks.slice(offset, offset + limit),
		};
	}

	getWebhook(id: string) {
		return this.webhooks.find((w) => w.id === id);
	}

	clearWebhooks() {
		const count = this.webhooks.length;
		this.webhooks = [];
		this.config.attemptCounts.clear();
		return count;
	}

	getConfig() {
		return {
			...this.config,
			attemptCounts: Array.from(this.config.attemptCounts.entries()),
		};
	}

	updateConfig(newConfig: Partial<Config>) {
		this.config = {
			...this.config,
			...newConfig,
		};
		if (Array.isArray((newConfig as any).attemptCounts)) {
			this.config.attemptCounts = new Map((newConfig as any).attemptCounts);
		}
		return this.getConfig();
	}

	getConfigRaw() {
		return this.config;
	}

	incrementAttempt(key: string): number {
		const count = (this.config.attemptCounts.get(key) || 0) + 1;
		this.config.attemptCounts.set(key, count);
		return count;
	}

	verifySignature(payload: string, signature: string, secret: string): boolean {
		if (!signature) return false;

		const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex');

		const providedSignature = signature.replace('sha256=', '');

		if (providedSignature.length !== expectedSignature.length) {
			return false;
		}

		let result = 0;
		for (let i = 0; i < expectedSignature.length; i++) {
			result |= expectedSignature.charCodeAt(i) ^ providedSignature.charCodeAt(i);
		}

		return result === 0;
	}
}

export const webhookStore = new WebhookStore();
