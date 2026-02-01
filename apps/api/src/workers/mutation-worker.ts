import { eq } from 'drizzle-orm';

import { config } from '@/config.js';
import { db } from '@/db/connection.js';
import { configurations, transformationJobs } from '@/db/schema.js';
import { ConversionServiceFactory } from '@/services/conversion/index.js';
import {
	type JobResult,
	type TransformationJobData as MutationJobData,
	transformationQueue,
} from '@/services/queue.js';
import { storageService } from '@/services/storage.js';
import { WebhookService, webhookService } from '@/services/webhook.js';
import type {
	Configuration,
	ConversionType,
	InputFormat,
	OutputFormatConfig,
	TransformationRule,
} from '@/types/index.js';

class MutationWorker {
	private isShuttingDown = false;

	constructor() {
		transformationQueue.process('mutate-file', this.processMutationJob.bind(this));

		process.on('SIGTERM', this.shutdown.bind(this));
		process.on('SIGINT', this.shutdown.bind(this));
	}

	private async processMutationJob(job: any): Promise<JobResult> {
		const queueData = job.data;
		const fileBuffer = Buffer.from(queueData.fileData, 'base64');

		const jobData: MutationJobData = {
			jobId: queueData.jobId,
			organizationId: queueData.organizationId,
			configurationId: queueData.configurationId,
			fileBuffer: fileBuffer,
			fileName: queueData.fileName,
			conversionType: queueData.conversionType,
			callbackUrl: queueData.callbackUrl,
			uid: queueData.uid,
			options: queueData.options,
		};

		const jobId = jobData.jobId;

		console.log(`Processing transformation job: ${jobId}`, {
			organizationId: jobData.organizationId,
			configurationId: jobData.configurationId,
			fileName: jobData.fileName,
		});

		console.log(
			`Worker file buffer info: size=${jobData.fileBuffer.length}, first 50 bytes=${jobData.fileBuffer.slice(0, 50).toString('hex')}`,
		);

		try {
			await this.updateJobStatus(jobId, 'processing', {
				startedAt: new Date(),
			});

			await job.progress(10);

			const [configuration] = await db
				.select()
				.from(configurations)
				.where(eq(configurations.id, jobData.configurationId))
				.limit(1);

			if (!configuration) {
				throw new Error(`Configuration ${jobData.configurationId} not found`);
			}

			await job.progress(20);

			let inputFileResult;
			if (config.STORAGE_TYPE !== 'local') {
				inputFileResult = await storageService.uploadInputFile(
					jobData.fileBuffer,
					jobData.fileName,
					jobData.organizationId,
					jobId,
				);

				await this.updateJobStatus(jobId, 'processing', {
					inputFileUrl: inputFileResult.url,
					inputFileKey: inputFileResult.key,
					originalFileName: jobData.fileName,
					fileSize: jobData.fileBuffer.length,
				});
			}

			await job.progress(30);

			const serviceConfig: Configuration = {
				id: configuration.id,
				organizationId: configuration.organizationId,
				name: configuration.name,
				description: configuration.description || undefined,
				rules: configuration.rules as TransformationRule[],
				outputFormat: configuration.outputFormat as OutputFormatConfig,
				conversionType: configuration.conversionType as ConversionType,
				inputFormat: configuration.inputFormat as InputFormat,
				version: configuration.version,
				isActive: configuration.isActive,
				createdBy: configuration.createdBy,
				createdAt: configuration.createdAt,
				updatedAt: configuration.updatedAt,
			};

			const result = await ConversionServiceFactory.convertFile(
				jobData.fileBuffer,
				serviceConfig,
				jobData.options || {},
			);

			await job.progress(70);

			if (!result.success) {
				throw new Error(result.error || 'Conversion failed');
			}

			if (!result.outputData) {
				throw new Error('Conversion succeeded but no output data was produced');
			}

			const outputBuffer = result.outputData;
			const outputFileName = this.generateOutputFileName(
				jobData.fileName,
				result.fileExtension || 'bin',
			);

			const outputFileResult = await storageService.uploadTransformedFile(
				outputBuffer,
				outputFileName,
				jobData.organizationId,
				jobId,
			);

			await job.progress(90);

			const updateData: any = {
				status: 'completed' as const,
				outputFileUrl: outputFileResult.url,
				outputFileKey: outputFileResult.key,
				executionLog: result.executionLog,
				completedAt: new Date(),
			};

			if (!inputFileResult) {
				updateData.originalFileName = jobData.fileName;
				updateData.fileSize = jobData.fileBuffer.length;
			}

			await this.updateJobStatus(jobId, 'completed', updateData);

			await this.sendWebhookNotification(jobData, outputFileResult.url, result.executionLog);

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
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';

			console.error(`Transformation job failed: ${jobId}`, {
				error: errorMessage,
				fileName: jobData.fileName,
			});

			await this.updateJobStatus(jobId, 'failed', {
				errorMessage,
				completedAt: new Date(),
			});

			await this.sendWebhookNotification(jobData, undefined, undefined, errorMessage);

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
		jobData: MutationJobData,
		downloadUrl?: string,
		executionLog?: string[],
		error?: string,
	): Promise<void> {
		try {
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
					uid: jobData.uid,
					downloadUrl,
					executionLog,
					error,
					originalFileName: jobData.fileName,
				},
				downloadUrl ? new Date(Date.now() + config.FILE_TTL * 1000) : undefined,
			);

			const delivery = await webhookService.sendWebhookWithPriority(
				jobData.organizationId,
				jobData.configurationId,
				payload,
				jobData.callbackUrl, // Transform request callback URL (highest priority)
			);

			if (delivery?.status === 'success') {
				await db
					.update(transformationJobs)
					.set({ webhookDelivered: true })
					.where(eq(transformationJobs.id, jobData.jobId));

				console.log(`Webhook delivered successfully for job ${jobData.jobId}`);
			} else if (delivery?.status === 'pending') {
				console.log(`Webhook queued for asynchronous delivery for job ${jobData.jobId}`);
			} else if (delivery?.status === 'failed') {
				console.error(`Webhook delivery failed for job ${jobData.jobId}:`, delivery.error);
			} else {
				console.log(
					`No webhook configured for organization ${jobData.organizationId}, job ${jobData.jobId}`,
				);
			}
		} catch (error) {
			console.error(`Failed to send webhook for job ${jobData.jobId}:`, error);
		}
	}

	private generateOutputFileName(originalFileName: string, extension: string): string {
		const baseName = originalFileName.replace(/\.[^/.]+$/, '');
		return `${baseName}_transformed.${extension}`;
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

export const mutationWorker = new MutationWorker();

export { MutationWorker };
