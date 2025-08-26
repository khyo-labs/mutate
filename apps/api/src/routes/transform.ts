import { and, eq } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';
import { ulid } from 'ulid';

import { db } from '../db/connection.js';
import { configurations, transformationJobs } from '../db/schema.js';
import { authenticateAPIKey } from '../middleware/auth.js';
import '../types/fastify.js';
import { logError } from '../utils/logger.js';

export async function transformRoutes(fastify: FastifyInstance) {
	// Add API key authentication to all routes
	fastify.addHook('preHandler', authenticateAPIKey);

	// Transform file
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

			// Get form fields
			const fields = data.fields as any;
			const configId = fields?.configId?.value;
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

			// Check file size for sync/async processing
			const fileSize = data.file.bytesRead || 0;
			const isAsync = options.async || fileSize >= 10 * 1024 * 1024; // 10MB threshold

			// Create transformation job
			const [job] = await db
				.insert(transformationJobs)
				.values({
					id: ulid(),
					organizationId: request.currentUser!.organizationId,
					configurationId: configId,
					status: isAsync ? 'pending' : 'processing',
					createdBy: request.currentUser!.id,
					startedAt: isAsync ? undefined : new Date(),
				})
				.returning();

			if (isAsync) {
				// Queue for async processing
				return reply.code(202).send({
					success: true,
					data: {
						jobId: job.id,
						status: 'processing',
						statusUrl: `/v1/jobs/${job.id}`,
					},
				});
			} else {
				// Process synchronously (placeholder - would implement actual processing)
				// For now, just simulate successful processing
				const [completedJob] = await db
					.update(transformationJobs)
					.set({
						status: 'completed',
						completedAt: new Date(),
						outputFileUrl: `https://example.com/files/${job.id}/output.csv`,
					})
					.where(eq(transformationJobs.id, job.id))
					.returning();

				return {
					success: true,
					data: {
						jobId: completedJob.id,
						status: 'completed',
						downloadUrl: completedJob.outputFileUrl,
						expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
					},
				};
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

			return {
				success: true,
				data: {
					jobId: job.id,
					status: job.status,
					progress:
						job.status === 'completed'
							? 100
							: job.status === 'processing'
								? 50
								: 0,
					downloadUrl: job.outputFileUrl,
					error: job.errorMessage,
					startedAt: job.startedAt,
					completedAt: job.completedAt,
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
}
