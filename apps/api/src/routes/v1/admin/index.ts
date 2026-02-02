import { eq, sql } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';

import { db } from '@/db/connection.js';
import {
	organization,
	platformAdmins,
	transformationJobs,
	twoFactor,
	usageRecords,
	user,
} from '@/db/schema.js';
import { requireAdmin } from '@/middleware/auth.js';
import { adminAuditService } from '@/services/admin/audit-service.js';
import { adminService } from '@/services/admin/index.js';
import '@/types/fastify.js';
import { logError } from '@/utils/logger.js';

import { adminBillingRoutes } from './billing.js';
import { adminFeatureRoutes } from './features.js';
import { adminHealthRoutes } from './health.js';
import { adminWebhookRoutes } from './webhooks.js';
import { adminWorkspaceRoutes } from './workspaces.js';

export async function adminRoutes(fastify: FastifyInstance) {
	fastify.addHook('preHandler', fastify.authenticate);
	fastify.addHook('preHandler', requireAdmin);

	fastify.register(adminBillingRoutes, {
		prefix: '/billing',
	});

	fastify.register(adminWorkspaceRoutes, {
		prefix: '/workspaces',
	});

	fastify.register(adminHealthRoutes, {
		prefix: '/health',
	});

	fastify.register(adminWebhookRoutes, {
		prefix: '/webhooks',
	});

	fastify.register(adminFeatureRoutes, {
		prefix: '/features',
	});

	fastify.get('/check-access', async (request, reply) => {
		try {
			if (!request.currentUser) {
				return {
					success: true,
					data: {
						isAdmin: false,
						requires2FA: false,
						has2FAEnabled: false,
					},
				};
			}

			const userIsAdmin = await adminService.isAdmin(request.currentUser.id);

			return {
				success: true,
				data: {
					isAdmin: userIsAdmin,
					requires2FA: false,
					has2FAEnabled: false,
				},
			};
		} catch (error) {
			logError(request.log, 'Check admin access error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'ACCESS_CHECK_FAILED',
					message: 'Failed to check admin access',
				},
			});
		}
	});

	fastify.get('/overview', async (request, reply) => {
		try {
			const totalOrgs = await db
				.select({ count: sql<number>`count(*)` })
				.from(organization)
				.then((rows) => Number(rows[0]?.count || 0));

			const totalUsers = await db
				.select({ count: sql<number>`count(*)` })
				.from(user)
				.then((rows) => Number(rows[0]?.count || 0));

			const now = new Date();
			const currentMonth = now.getMonth() + 1;
			const currentYear = now.getFullYear();

			const monthlyTransformations = await db
				.select({
					total: sql<number>`sum(conversion_count)`,
				})
				.from(usageRecords)
				.where(sql`month = ${currentMonth} AND year = ${currentYear}`)
				.then((rows) => Number(rows[0]?.total || 0));

			const activeJobs = await db
				.select({ count: sql<number>`count(*)` })
				.from(transformationJobs)
				.where(sql`status IN ('pending', 'processing')`)
				.then((rows) => Number(rows[0]?.count || 0));

			const sevenDaysAgo = new Date();
			sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

			const recentSignups = await db
				.select({ count: sql<number>`count(*)` })
				.from(user)
				.where(sql`created_at >= ${sevenDaysAgo.toISOString()}`)
				.then((rows) => Number(rows[0]?.count || 0));

			const oneDayAgo = new Date();
			oneDayAgo.setDate(oneDayAgo.getDate() - 1);

			const [totalJobs, failedJobs] = await Promise.all([
				db
					.select({ count: sql<number>`count(*)` })
					.from(transformationJobs)
					.where(sql`created_at >= ${oneDayAgo.toISOString()}`)
					.then((rows) => Number(rows[0]?.count || 0)),
				db
					.select({ count: sql<number>`count(*)` })
					.from(transformationJobs)
					.where(sql`created_at >= ${oneDayAgo.toISOString()} AND status = 'failed'`)
					.then((rows) => Number(rows[0]?.count || 0)),
			]);

			const errorRate = totalJobs > 0 ? (failedJobs / totalJobs) * 100 : 0;

			if (request.currentUser) {
				await adminAuditService.logAdminAction(request.currentUser.id, 'VIEW_PLATFORM_OVERVIEW', {
					ipAddress: request.ip,
					userAgent: request.headers['user-agent'],
				});
			}

			return {
				success: true,
				data: {
					totalOrganizations: totalOrgs,
					totalUsers,
					monthlyTransformations,
					activeJobs,
					recentSignups,
					errorRate: errorRate.toFixed(2),
					lastUpdated: new Date().toISOString(),
				},
			};
		} catch (error) {
			logError(request.log, 'Get platform overview error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'OVERVIEW_FAILED',
					message: 'Failed to get platform overview',
				},
			});
		}
	});

	fastify.get('/stats', async (request, reply) => {
		try {
			const monthlyStats = [];
			const now = new Date();

			for (let i = 5; i >= 0; i--) {
				const date = new Date(now);
				date.setMonth(date.getMonth() - i);
				const month = date.getMonth() + 1;
				const year = date.getFullYear();

				const stats = await db
					.select({
						conversionCount: sql<number>`sum(conversion_count)`,
						overageCount: sql<number>`sum(overage_count)`,
					})
					.from(usageRecords)
					.where(sql`month = ${month} AND year = ${year}`)
					.then((rows) => ({
						month: date.toLocaleString('default', { month: 'short' }),
						year,
						conversions: Number(rows[0]?.conversionCount || 0),
						overages: Number(rows[0]?.overageCount || 0),
					}));

				monthlyStats.push(stats);
			}

			const orgGrowth = await db
				.select({
					date: sql<string>`DATE(created_at)`,
					count: sql<number>`count(*)`,
				})
				.from(organization)
				.where(sql`created_at >= NOW() - INTERVAL '30 days'`)
				.groupBy(sql`DATE(created_at)`)
				.orderBy(sql`DATE(created_at)`);

			return {
				success: true,
				data: {
					monthlyStats,
					orgGrowth,
				},
			};
		} catch (error) {
			logError(request.log, 'Get platform stats error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'STATS_FAILED',
					message: 'Failed to get platform statistics',
				},
			});
		}
	});
}
