import { and, count, desc, eq, gte, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import { db } from '@/db/connection.js';
import { configurations, transformationJobs } from '@/db/schema.js';
import { validateWorkspaceAccess } from '@/middleware/workspace-access.js';
import '@/types/fastify.js';
import { logError } from '@/utils/logger.js';

export async function jobRoutes(fastify: FastifyInstance) {
	fastify.addHook('preHandler', async (request, reply) => {
		await fastify.authenticate(request, reply);
		await validateWorkspaceAccess(request, reply);
	});

	fastify.get('/', async (request, reply) => {
		try {
			const organizationId = request.workspace!.id;
			const {
				configurationId,
				limit: limitStr,
				offset: offsetStr,
				status,
			} = request.query as {
				configurationId?: string;
				limit?: string;
				offset?: string;
				status?: string;
			};

			const limit = Math.min(parseInt(limitStr || '10', 10), 100);
			const offset = parseInt(offsetStr || '0', 10);

			const conditions = [eq(transformationJobs.organizationId, organizationId)];

			if (configurationId) {
				conditions.push(eq(transformationJobs.configurationId, configurationId));
			}

			if (status) {
				conditions.push(eq(transformationJobs.status, status));
			}

			const jobs = await db
				.select({
					id: transformationJobs.id,
					configurationId: transformationJobs.configurationId,
					configurationName: configurations.name,
					status: transformationJobs.status,
					originalFileName: transformationJobs.originalFileName,
					fileSize: transformationJobs.fileSize,
					inputFileKey: transformationJobs.inputFileKey,
					outputFileKey: transformationJobs.outputFileKey,
					errorMessage: transformationJobs.errorMessage,
					startedAt: transformationJobs.startedAt,
					completedAt: transformationJobs.completedAt,
					createdBy: transformationJobs.createdBy,
					createdAt: transformationJobs.createdAt,
				})
				.from(transformationJobs)
				.leftJoin(configurations, eq(transformationJobs.configurationId, configurations.id))
				.where(and(...conditions))
				.orderBy(desc(transformationJobs.createdAt))
				.offset(offset)
				.limit(limit);

			const [totalResult] = await db
				.select({ count: count() })
				.from(transformationJobs)
				.where(and(...conditions));

			const jobsWithDuration = jobs.map((job) => {
				let durationMs: number | null = null;
				if (job.startedAt && job.completedAt) {
					durationMs = new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime();
				}

				return {
					...job,
					durationMs,
				};
			});

			return {
				success: true,
				data: jobsWithDuration,
				pagination: {
					total: totalResult?.count || 0,
					limit,
					offset,
				},
			};
		} catch (error) {
			logError(request.log, 'List jobs error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'LIST_JOBS_FAILED',
					message: 'Failed to list transformation jobs',
				},
			});
		}
	});

	fastify.get('/stats', async (request, reply) => {
		try {
			const organizationId = request.workspace!.id;
			const now = new Date();
			const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

			const stats = await db
				.select({
					configurationId: transformationJobs.configurationId,
					name: configurations.name,
					totalRuns: count(),
					successCount:
						sql<number>`count(*) filter (where ${transformationJobs.status} = 'completed')`.as(
							'success_count',
						),
					failedCount:
						sql<number>`count(*) filter (where ${transformationJobs.status} = 'failed')`.as(
							'failed_count',
						),
				})
				.from(transformationJobs)
				.leftJoin(configurations, eq(transformationJobs.configurationId, configurations.id))
				.where(
					and(
						eq(transformationJobs.organizationId, organizationId),
						gte(transformationJobs.createdAt, monthStart),
					),
				)
				.groupBy(transformationJobs.configurationId, configurations.name);

			return {
				success: true,
				data: stats,
			};
		} catch (error) {
			logError(request.log, 'Job stats error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'JOB_STATS_FAILED',
					message: 'Failed to get job statistics',
				},
			});
		}
	});
}
