import { and, eq } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';
import { ulid } from 'ulid';

import { config } from '../config.js';
import { db } from '../db/connection.js';
import { configurations, transformationJobs } from '../db/schema.js';
import { authenticateAPIKey } from '../middleware/auth.js';
import { QueueService } from '../services/queue.js';
import { storageService } from '../services/storage.js';
import type { ConversionType } from '../types/index.js';
import { WebhookService } from '../services/webhook.js';
import { trackConversionStart } from '../middleware/billing-middleware.js';
import { QuotaEnforcementService } from '../services/billing/index.js';
import '../types/fastify.js';
import { logError } from '../utils/logger.js';

// Helper function to validate file type against conversion type
function validateFileType(conversionType: ConversionType, filename: string, fileBuffer: Buffer): { valid: boolean; error?: string } {
	const getFileExtension = (filename: string) => {
		const parts = filename.split('.');
		return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
	};

	const hasValidMagicNumber = (buffer: Buffer, conversionType: ConversionType): boolean => {
		const magicNumbers = {
			'XLSX_TO_CSV': [
				[0x50, 0x4B, 0x03, 0x04], // ZIP signature (XLSX are ZIP files)
				[0x50, 0x4B, 0x07, 0x08], // ZIP signature variant
				[0x50, 0x4B, 0x05, 0x06], // ZIP signature variant
			],
		};

		const signatures = magicNumbers[conversionType as keyof typeof magicNumbers];
		if (!signatures) return true; // No validation for unsupported types

		return signatures.some(signature => {
			if (buffer.length < signature.length) return false;
			return signature.every((byte, index) => buffer[index] === byte);
		});
	};

	const expectedExtensions = {
		'XLSX_TO_CSV': ['xlsx', 'xls'],
		'DOCX_TO_PDF': ['docx', 'doc'],
		'HTML_TO_PDF': ['html', 'htm'],
		'PDF_TO_CSV': ['pdf'],
		'JSON_TO_CSV': ['json'],
		'CSV_TO_JSON': ['csv'],
	};

	const extension = getFileExtension(filename);
	const allowedExtensions = expectedExtensions[conversionType];

	if (!allowedExtensions.includes(extension)) {
		return {
			valid: false,
			error: `Invalid file type. Expected ${allowedExtensions.join(' or ')} file for ${conversionType} conversion, got ${extension || 'unknown'}`,
		};
	}

	// Additional validation for supported conversion types with magic number check
	if (conversionType === 'XLSX_TO_CSV' && !hasValidMagicNumber(fileBuffer, conversionType)) {
		return {
			valid: false,
			error: 'File does not appear to be a valid XLSX/XLS file',
		};
	}

	return { valid: true };
}

export async function mutateRoutes(fastify: FastifyInstance) {
	fastify.addHook('preHandler', authenticateAPIKey);

	fastify.post('/', async (request, reply) => {
		try {
			// Parse multipart form data
			const data = await request.file();

			if (!data) {
				return reply.code(400).send({
					success: false,
					error: {
						code: 'FILE_REQUIRED',
						message: 'File is required',
					},
				});
			}

			const fields = data.fields as any;
			const configId = fields?.configId?.value;
			const callbackUrl = fields?.callbackUrl?.value;
			const uid = fields?.uid?.value;
			const options = fields?.options ? JSON.parse(fields.options.value) : {};

			if (!configId) {
				return reply.code(400).send({
					success: false,
					error: {
						code: 'CONFIG_ID_REQUIRED',
						message: 'Configuration ID is required',
					},
				});
			}

			// Validate callback URL if provided
			if (callbackUrl) {
				const validation = WebhookService.validateWebhookUrl(callbackUrl);
				if (!validation.valid) {
					return reply.code(400).send({
						success: false,
						error: {
							code: 'INVALID_CALLBACK_URL',
							message: validation.error,
						},
					});
				}
			}

			// Validate configuration exists and user has access
			const [configuration] = await db
				.select()
				.from(configurations)
				.where(
					and(
						eq(configurations.id, configId),
						eq(
							configurations.organizationId,
							request.currentUser!.organizationId,
						),
						eq(configurations.isActive, true),
					),
				)
				.limit(1);

			if (!configuration) {
				return reply.code(404).send({
					success: false,
					error: {
						code: 'CONFIGURATION_NOT_FOUND',
						message: 'Configuration not found or access denied',
					},
				});
			}

			// Collect file data from the stream
			const chunks: Buffer[] = [];
			for await (const chunk of data.file) {
				chunks.push(chunk);
			}
			const fileBuffer = Buffer.concat(chunks);

			// Validate file type against conversion type
			const fileValidation = validateFileType(
				configuration.conversionType as ConversionType,
				data.filename || 'upload',
				fileBuffer
			);

			if (!fileValidation.valid) {
				return reply.code(400).send({
					success: false,
					error: {
						code: 'INVALID_FILE_TYPE',
						message: fileValidation.error,
					},
				});
			}

			// Debug: Log file buffer info
			console.log(
				`File buffer info: size=${fileBuffer.length}, first 50 bytes=${fileBuffer.slice(0, 50).toString('hex')}`,
			);

			// Check file size constraints
			if (fileBuffer.length > config.MAX_FILE_SIZE) {
				return reply.code(400).send({
					success: false,
					error: {
						code: 'FILE_TOO_LARGE',
						message: `File size exceeds maximum allowed size of ${config.MAX_FILE_SIZE} bytes`,
					},
				});
			}

			// Billing quota validation
			const quotaService = new QuotaEnforcementService();
			const fileSizeMb = fileBuffer.length / (1024 * 1024);
			const quotaValidation = await quotaService.validateConversionQuota(
				request.currentUser!.organizationId,
				fileSizeMb
			);

			if (!quotaValidation.canProceed) {
				return reply.code(403).send({
					success: false,
					error: {
						code: 'QUOTA_EXCEEDED',
						message: quotaValidation.reason,
					},
					limits: quotaValidation.limits,
					usage: quotaValidation.usage,
				});
			}

			// Determine if processing should be async
			const isAsync =
				options.async !== false && fileBuffer.length >= config.ASYNC_THRESHOLD;

			// Create transformation job
			const jobId = ulid();
			const [job] = await db
				.insert(transformationJobs)
				.values({
					id: jobId,
					organizationId: request.currentUser!.organizationId,
					configurationId: configId,
					status: 'pending',
					originalFileName: data.filename || 'upload.xlsx',
					fileSize: fileBuffer.length,
					callbackUrl: callbackUrl || configuration.callbackUrl, // Use job-specific or config default
					uid: uid, // User-provided identifier for tracking
					createdBy: request.currentUser!.id,
				})
				.returning();

			// Track conversion start for billing
			await trackConversionStart(
				request.currentUser!.organizationId,
				job.id,
				configuration.conversionType as 'XLSX_TO_CSV' | 'DOCX_TO_PDF',
				fileBuffer.length
			);

			if (isAsync) {
				// Queue for async processing
				await QueueService.addTransformationJob({
					jobId: job.id,
					organizationId: request.currentUser!.organizationId,
					configurationId: configId,
					fileBuffer,
					fileName: data.filename || 'upload.xlsx',
					conversionType: configuration.conversionType as 'XLSX_TO_CSV' | 'DOCX_TO_PDF',
					callbackUrl: callbackUrl || configuration.callbackUrl,
					uid: uid,
					options,
				});

				return reply.code(202).send({
					success: true,
					data: {
						jobId: job.id,
						status: 'queued',
						statusUrl: `/v1/mutate/jobs/${job.id}`,
						message:
							'File queued for processing. Use the status URL to check progress.',
					},
				});
			} else {
				// For small files, still use the queue but with higher priority for faster processing
				await QueueService.addTransformationJob(
					{
						jobId: job.id,
						organizationId: request.currentUser!.organizationId,
						configurationId: configId,
						fileBuffer,
						fileName: data.filename || 'upload.xlsx',
						conversionType: configuration.conversionType as 'XLSX_TO_CSV' | 'DOCX_TO_PDF',
						callbackUrl: callbackUrl || configuration.callbackUrl,
						uid: uid,
						options,
					},
					'high',
				);

				return reply.code(202).send({
					success: true,
					data: {
						jobId: job.id,
						status: 'queued',
						statusUrl: `/v1/mutate/jobs/${job.id}`,
						message: 'File queued for processing with high priority.',
					},
				});
			}
		} catch (error) {
			logError(request.log, 'Transform error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'TRANSFORMATION_FAILED',
					message: 'File transformation failed',
				},
			});
		}
	});

	// Get job status
	fastify.get('/jobs/:jobId', async (request, reply) => {
		const { jobId } = request.params as { jobId: string };

		try {
			const [job] = await db
				.select()
				.from(transformationJobs)
				.where(
					and(
						eq(transformationJobs.id, jobId),
						eq(
							transformationJobs.organizationId,
							request.currentUser!.organizationId,
						),
					),
				)
				.limit(1);

			if (!job) {
				return reply.code(404).send({
					success: false,
					error: {
						code: 'JOB_NOT_FOUND',
						message: 'Job not found',
					},
				});
			}

			// Get queue job status for more accurate progress
			let queueStatus;
			try {
				queueStatus = await QueueService.getJobStatus(jobId);
			} catch (error) {
				// Queue job might not exist anymore if completed/failed
				console.log(`Queue job ${jobId} not found, using database status`);
			}

			const progress =
				queueStatus?.progress ||
				(job.status === 'completed'
					? 100
					: job.status === 'processing'
						? 50
						: job.status === 'failed'
							? 0
							: 0);

			return {
				success: true,
				data: {
					jobId: job.id,
					status: queueStatus?.status || job.status,
					progress,
					downloadUrl: job.outputFileUrl,
					originalFileName: job.originalFileName,
					fileSize: job.fileSize,
					uid: job.uid,
					error: job.errorMessage,
					executionLog: job.executionLog,
					webhookDelivered: job.webhookDelivered,
					startedAt: job.startedAt,
					completedAt: job.completedAt,
					createdAt: job.createdAt,
				},
			};
		} catch (error) {
			logError(request.log, 'Get job status error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'JOB_STATUS_FAILED',
					message: 'Failed to get job status',
				},
			});
		}
	});

	// Generate fresh download URL
	fastify.post('/jobs/:jobId/download', async (request, reply) => {
		const { jobId } = request.params as { jobId: string };

		try {
			const [job] = await db
				.select()
				.from(transformationJobs)
				.where(
					and(
						eq(transformationJobs.id, jobId),
						eq(
							transformationJobs.organizationId,
							request.currentUser!.organizationId,
						),
						eq(transformationJobs.status, 'completed'),
					),
				)
				.limit(1);

			if (!job) {
				return reply.code(404).send({
					success: false,
					error: {
						code: 'JOB_NOT_FOUND',
						message: 'Completed job not found',
					},
				});
			}

			if (!job.outputFileKey) {
				return reply.code(404).send({
					success: false,
					error: {
						code: 'FILE_NOT_FOUND',
						message: 'Output file not found in storage',
					},
				});
			}

			// Generate fresh presigned URL
			const downloadUrl = await storageService.generateFreshPresignedUrl(
				job.outputFileKey,
				config.FILE_TTL,
			);

			return {
				success: true,
				data: {
					downloadUrl,
					expiresAt: new Date(
						Date.now() + config.FILE_TTL * 1000,
					).toISOString(),
					originalFileName: job.originalFileName,
					fileSize: job.fileSize,
				},
			};
		} catch (error) {
			logError(request.log, 'Generate download URL error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'DOWNLOAD_URL_FAILED',
					message: 'Failed to generate download URL',
				},
			});
		}
	});

	// Queue health and statistics
	fastify.get('/queue/stats', async (request, reply) => {
		try {
			const stats = await QueueService.getQueueStats();

			return {
				success: true,
				data: {
					queue: stats,
					timestamp: new Date().toISOString(),
				},
			};
		} catch (error) {
			logError(request.log, 'Queue stats error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'QUEUE_STATS_FAILED',
					message: 'Failed to get queue statistics',
				},
			});
		}
	});
}
