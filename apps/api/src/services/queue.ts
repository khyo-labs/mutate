import Queue from 'bull';
import IORedis from 'ioredis';

import { config } from '@/config.js';
import {
	trackConversionComplete,
	trackConversionFailure,
} from '@/middleware/billing-middleware.js';

// Job data interfaces
export interface TransformationJobData {
	jobId: string;
	organizationId: string;
	configurationId: string;
	fileBuffer: Buffer;
	fileName: string;
	conversionType: 'XLSX_TO_CSV' | 'DOCX_TO_PDF';
	callbackUrl?: string;
	uid?: string;
	options?: {
		debug?: boolean;
	};
}

// Internal queue data (Buffer converted to string for serialization)
export interface QueueJobData {
	jobId: string;
	organizationId: string;
	configurationId: string;
	fileData: string; // Base64 encoded file data
	fileName: string;
	conversionType: 'XLSX_TO_CSV' | 'DOCX_TO_PDF';
	callbackUrl?: string;
	uid?: string;
	options?: {
		debug?: boolean;
	};
}

export interface JobResult {
	success: boolean;
	downloadUrl?: string;
	error?: string;
	executionLog?: string[];
	fileSize?: number;
}

// Webhook delivery job
export interface WebhookDeliveryJobData {
	deliveryId: string;
}

// Create Redis connection
// Upstash URLs start with 'rediss://' and require TLS
const isUpstash = config.REDIS_URL.startsWith('rediss://');
const upstashOptions = isUpstash
	? {
			enableReadyCheck: false,
			tls: {},
			family: 6, // Force IPv6 for better Upstash compatibility
		}
	: {};

const redis = new IORedis(config.REDIS_URL, {
	maxRetriesPerRequest: 3,
	...upstashOptions,
});

// Create transformation queue
export const transformationQueue = new Queue<QueueJobData>('file-transformation', {
	redis: {
		port: redis.options.port || 6379,
		host: redis.options.host || 'localhost',
		password: redis.options.password,
		db: redis.options.db || 0,
	},
	defaultJobOptions: {
		removeOnComplete: 100, // Keep last 100 completed jobs
		removeOnFail: 50, // Keep last 50 failed jobs
		attempts: 3,
		backoff: {
			type: 'exponential',
			delay: 5000,
		},
	},
	settings: {
		stalledInterval: 30 * 1000, // 30 seconds
		retryProcessDelay: 5 * 1000, // 5 seconds
	},
});

// Webhook delivery queue and DLQ
export const webhookDeliveryQueue = new Queue<WebhookDeliveryJobData>('webhook-delivery', {
	redis: {
		port: redis.options.port || 6379,
		host: redis.options.host || 'localhost',
		password: redis.options.password,
		db: redis.options.db || 0,
	},
	defaultJobOptions: {
		removeOnComplete: 200,
		removeOnFail: 100,
		attempts: config.WEBHOOK_MAX_RETRIES ?? 5,
		backoff: { type: 'exponential', delay: 1000 },
	},
});

export const webhookDeadLetterQueue = new Queue<WebhookDeliveryJobData>('webhook-dead-letter', {
	redis: {
		port: redis.options.port || 6379,
		host: redis.options.host || 'localhost',
		password: redis.options.password,
		db: redis.options.db || 0,
	},
	defaultJobOptions: {
		removeOnComplete: 500,
	},
});

export class QueueService {
	static async addTransformationJob(
		data: TransformationJobData,
		priority: 'low' | 'normal' | 'high' = 'normal',
	): Promise<Queue.Job<QueueJobData>> {
		const priorityMap = {
			low: 10,
			normal: 5,
			high: 1,
		};

		// Convert Buffer to base64 string for queue serialization
		const queueData: QueueJobData = {
			jobId: data.jobId,
			organizationId: data.organizationId,
			configurationId: data.configurationId,
			fileData: data.fileBuffer.toString('base64'),
			fileName: data.fileName,
			conversionType: data.conversionType,
			callbackUrl: data.callbackUrl,
			uid: data.uid,
			options: data.options,
		};

		const job = await transformationQueue.add('mutate-file', queueData, {
			priority: priorityMap[priority],
			delay: 0,
			// Add job-specific options based on file size
			attempts: data.fileBuffer.length > 50 * 1024 * 1024 ? 5 : 3, // More attempts for larger files
		});

		return job;
	}

	static async getJobStatus(jobId: string): Promise<{
		status: string;
		progress: number;
		result?: JobResult;
		error?: string;
	} | null> {
		const job = await transformationQueue.getJob(jobId);

		if (!job) {
			return null;
		}

		const progress = job.progress();
		let status = 'pending';

		if (await job.isCompleted()) {
			status = 'completed';
		} else if (await job.isFailed()) {
			status = 'failed';
		} else if (await job.isActive()) {
			status = 'processing';
		} else if (await job.isWaiting()) {
			status = 'pending';
		}

		return {
			status,
			progress: typeof progress === 'number' ? progress : 0,
			result: job.returnvalue,
			error: job.failedReason,
		};
	}

	static async removeJob(jobId: string): Promise<boolean> {
		const job = await transformationQueue.getJob(jobId);
		if (job) {
			await job.remove();
			return true;
		}
		return false;
	}

	static async getQueueStats(): Promise<{
		waiting: number;
		active: number;
		completed: number;
		failed: number;
		delayed: number;
		paused: number;
	}> {
		const waiting = await transformationQueue.getWaiting();
		const active = await transformationQueue.getActive();
		const completed = await transformationQueue.getCompleted();
		const failed = await transformationQueue.getFailed();
		const delayed = await transformationQueue.getDelayed();

		return {
			waiting: waiting.length,
			active: active.length,
			completed: completed.length,
			failed: failed.length,
			delayed: delayed.length,
			paused: 0, // Paused count not available in this Bull version
		};
	}

	static async pauseQueue(): Promise<void> {
		await transformationQueue.pause();
	}

	static async resumeQueue(): Promise<void> {
		await transformationQueue.resume();
	}

	static async cleanQueue(
		grace: number = 24 * 60 * 60 * 1000, // 24 hours
		type: 'completed' | 'failed' | 'active' = 'completed',
	): Promise<void> {
		await transformationQueue.clean(grace, type);
	}
}

// Event handlers for queue monitoring
transformationQueue.on('completed', async (job, result) => {
	console.log(`Job ${job.id} completed successfully:`, {
		jobId: job.id,
		duration: Date.now() - job.processedOn!,
		result: result?.success,
	});

	// Track billing for completed conversion
	try {
		const fileBuffer = Buffer.from(job.data.fileData, 'base64');
		await trackConversionComplete(
			job.data.organizationId,
			job.data.jobId,
			job.data.conversionType,
			fileBuffer.length,
		);
	} catch (error) {
		console.error('Failed to track conversion completion for billing:', error);
	}
});

transformationQueue.on('failed', async (job, err) => {
	console.error(`Job ${job.id} failed:`, {
		jobId: job.id,
		error: err.message,
		attempts: job.attemptsMade,
		data: job.data.fileName,
	});

	// Track billing for failed conversion (remove from active)
	try {
		await trackConversionFailure(job.data.organizationId, job.data.jobId);
	} catch (error) {
		console.error('Failed to track conversion failure for billing:', error);
	}
});

transformationQueue.on('active', (job) => {
	console.log(`Job ${job.id} started processing:`, {
		jobId: job.id,
		fileName: job.data.fileName,
		organizationId: job.data.organizationId,
	});
});

transformationQueue.on('stalled', (job) => {
	console.warn(`Job ${job.id} stalled:`, {
		jobId: job.id,
		fileName: job.data.fileName,
	});
});

// Graceful shutdown
process.on('SIGTERM', async () => {
	console.log('Gracefully shutting down transformation queue...');
	await transformationQueue.close();
	await redis.disconnect();
});

process.on('SIGINT', async () => {
	console.log('Gracefully shutting down transformation queue...');
	await transformationQueue.close();
	await redis.disconnect();
});

export { redis };
