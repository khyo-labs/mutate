import { eq } from 'drizzle-orm';

import { config } from '../config.js';
import { db } from '../db/connection.js';
import { configurations, transformationJobs } from '../db/schema.js';
import {
	type JobResult,
	type TransformationJobData,
	transformationQueue,
} from '../services/queue.js';
import { storageService } from '../services/storage.js';
import { TransformationService } from '../services/transform.js';
import { WebhookService, webhookService } from '../services/webhook.js';
import type {
	Configuration,
	OutputFormat,
	TransformationRule,
} from '../types/index.js';

class TransformationWorker {
	private isShuttingDown = false;

	constructor() {
		// Process transformation jobs
		transformationQueue.process(
			'transform-file',
			this.processTransformationJob.bind(this),
		);

		// Graceful shutdown handling
		process.on('SIGTERM', this.shutdown.bind(this));
		process.on('SIGINT', this.shutdown.bind(this));
	}

	private async processTransformationJob(job: any): Promise<JobResult> {
		// Convert base64 file data back to Buffer
		const queueData = job.data;
		const fileBuffer = Buffer.from(queueData.fileData, 'base64');
		
		const jobData: TransformationJobData = {
			jobId: queueData.jobId,
			organizationId: queueData.organizationId,
			configurationId: queueData.configurationId,
			fileBuffer: fileBuffer,
			fileName: queueData.fileName,
			webhookUrl: queueData.webhookUrl,
			options: queueData.options,
		};
		
		const jobId = jobData.jobId;

		console.log(`Processing transformation job: ${jobId}`, {
			organizationId: jobData.organizationId,
			configurationId: jobData.configurationId,
			fileName: jobData.fileName,
		});
		
		// Debug: Log file buffer info in worker
		console.log(`Worker file buffer info: size=${jobData.fileBuffer.length}, first 50 bytes=${jobData.fileBuffer.slice(0, 50).toString('hex')}`);

		try {
			// Update job status to processing
			await this.updateJobStatus(jobId, 'processing', {
				startedAt: new Date(),
			});

			// Update progress
			await job.progress(10);

			// Get configuration from database
			const [configuration] = await db
				.select()
				.from(configurations)
				.where(eq(configurations.id, jobData.configurationId))
				.limit(1);

			if (!configuration) {
				throw new Error(`Configuration ${jobData.configurationId} not found`);
			}

			await job.progress(20);

			// Upload input file to storage if not already uploaded
			let inputFileResult;
			if (config.STORAGE_TYPE !== 'local') {
				inputFileResult = await storageService.uploadInputFile(
					jobData.fileBuffer,
					jobData.fileName,
					jobData.organizationId,
					jobId,
				);

				// Update job with input file details
				await this.updateJobStatus(jobId, 'processing', {
					inputFileUrl: inputFileResult.url,
					inputFileKey: inputFileResult.key,
					originalFileName: jobData.fileName,
					fileSize: jobData.fileBuffer.length,
				});
			}

			await job.progress(30);

			// Convert database configuration to service configuration type
			const serviceConfig: Configuration = {
				id: configuration.id,
				organizationId: configuration.organizationId,
				name: configuration.name,
				description: configuration.description || undefined,
				rules: configuration.rules as TransformationRule[],
				outputFormat: configuration.outputFormat as OutputFormat,
				version: configuration.version,
				isActive: configuration.isActive,
				createdBy: configuration.createdBy,
				createdAt: configuration.createdAt,
				updatedAt: configuration.updatedAt,
			};

			// Process the transformation
			const transformService = new TransformationService();
			const result = await transformService.transformFile(
				jobData.fileBuffer,
				serviceConfig,
				jobData.options || {},
			);

			await job.progress(70);

			if (!result.success) {
				throw new Error(result.error || 'Transformation failed');
			}

			// Upload transformed file to storage
			const outputBuffer = Buffer.from(result.csvData!, 'utf-8');
			const outputFileName = this.generateOutputFileName(
				jobData.fileName,
				serviceConfig.outputFormat,
			);

			const outputFileResult = await storageService.uploadTransformedFile(
				outputBuffer,
				outputFileName,
				jobData.organizationId,
				jobId,
			);

			await job.progress(90);

			// Update job as completed
			const updateData: any = {
				status: 'completed' as const,
				outputFileUrl: outputFileResult.url,
				outputFileKey: outputFileResult.key,
				executionLog: result.executionLog,
				completedAt: new Date(),
			};

			if (!inputFileResult) {
				// If we didn't upload input file (local storage), add file details now
				updateData.originalFileName = jobData.fileName;
				updateData.fileSize = jobData.fileBuffer.length;
			}

			await this.updateJobStatus(jobId, 'completed', updateData);

			// Send webhook notification
			await this.sendWebhookNotification(
				jobData,
				outputFileResult.url,
				result.executionLog,
			);

			await job.progress(100);

			console.log(`Transformation job completed successfully: ${jobId}`, {
				outputSize: outputBuffer.length,
				downloadUrl: outputFileResult.url,
			});

			return {
				success: true,
				downloadUrl: outputFileResult.url,
				fileSize: outputBuffer.length,
				executionLog: result.executionLog,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error';

			console.error(`Transformation job failed: ${jobId}`, {
				error: errorMessage,
				fileName: jobData.fileName,
			});

			// Update job as failed
			await this.updateJobStatus(jobId, 'failed', {
				errorMessage,
				completedAt: new Date(),
			});

			// Send webhook notification for failure
			await this.sendWebhookNotification(
				jobData,
				undefined,
				undefined,
				errorMessage,
			);

			return {
				success: false,
				error: errorMessage,
			};
		}
	}

	private async updateJobStatus(
		jobId: string,
		status: string,
		additionalData: Record<string, any> = {},
	): Promise<void> {
		try {
			await db
				.update(transformationJobs)
				.set({ status, ...additionalData })
				.where(eq(transformationJobs.id, jobId));
		} catch (error) {
			console.error(`Failed to update job status for ${jobId}:`, error);
		}
	}

	private async sendWebhookNotification(
		jobData: TransformationJobData,
		downloadUrl?: string,
		executionLog?: string[],
		error?: string,
	): Promise<void> {
		// Determine webhook URL (job-specific or configuration default)
		let webhookUrl = jobData.webhookUrl;

		if (!webhookUrl) {
			// Check if configuration has a default webhook URL
			const [configuration] = await db
				.select({ webhookUrl: configurations.webhookUrl })
				.from(configurations)
				.where(eq(configurations.id, jobData.configurationId))
				.limit(1);

			webhookUrl = configuration?.webhookUrl || undefined;
		}

		if (!webhookUrl) {
			console.log(`No webhook URL configured for job ${jobData.jobId}`);
			return;
		}

		try {
			// Update webhook attempt tracking
			await db
				.update(transformationJobs)
				.set({
					webhookAttempts: 1,
					webhookLastAttempt: new Date(),
				})
				.where(eq(transformationJobs.id, jobData.jobId));

			const payload = WebhookService.createJobCompletedPayload(
				{
					jobId: jobData.jobId,
					configurationId: jobData.configurationId,
					organizationId: jobData.organizationId,
					status: error ? 'failed' : 'completed',
					downloadUrl,
					executionLog,
					error,
					originalFileName: jobData.fileName,
				},
				downloadUrl ? new Date(Date.now() + config.FILE_TTL * 1000) : undefined,
			);

			const delivery = await webhookService.sendWebhook(webhookUrl, payload);

			if (delivery.status === 'success') {
				// Mark webhook as delivered
				await db
					.update(transformationJobs)
					.set({ webhookDelivered: true })
					.where(eq(transformationJobs.id, jobData.jobId));

				console.log(`Webhook delivered successfully for job ${jobData.jobId}`);
			} else {
				console.error(
					`Webhook delivery failed for job ${jobData.jobId}:`,
					delivery.error,
				);
			}
		} catch (error) {
			console.error(`Failed to send webhook for job ${jobData.jobId}:`, error);
		}
	}

	private generateOutputFileName(
		originalFileName: string,
		outputFormat: OutputFormat,
	): string {
		const baseName = originalFileName.replace(/\.[^/.]+$/, ''); // Remove extension
		const delimiter = outputFormat.delimiter === ',' ? 'csv' : 'tsv';
		return `${baseName}_transformed.${delimiter}`;
	}

	private async shutdown(): Promise<void> {
		if (this.isShuttingDown) return;

		this.isShuttingDown = true;
		console.log('Gracefully shutting down transformation worker...');

		try {
			// Wait for current jobs to complete
			await transformationQueue.close();
			console.log('Transformation worker shutdown complete');
		} catch (error) {
			console.error('Error during transformation worker shutdown:', error);
		}

		process.exit(0);
	}

	// Health check method
	public async getHealth(): Promise<{
		status: 'healthy' | 'unhealthy';
		queueStats?: any;
		error?: string;
	}> {
		try {
			// Check if we can get queue stats
			const stats = await transformationQueue.getJobCounts();

			return {
				status: 'healthy',
				queueStats: stats,
			};
		} catch (error) {
			return {
				status: 'unhealthy',
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}
}

// Create and export worker instance
export const transformationWorker = new TransformationWorker();

// Export the class for testing
export { TransformationWorker };
