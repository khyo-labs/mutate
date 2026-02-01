import { and, desc, eq, sql } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';

import { db } from '@/db/connection.js';
import {
	member,
	organization,
	organizationSubscriptions,
	subscriptionPlans,
	transformationJobs,
	usageRecords,
} from '@/db/schema.js';
import { requireAdmin } from '@/middleware/auth.js';
import { adminAuditService } from '@/services/admin/audit-service.js';
import '@/types/fastify.js';
import { logError } from '@/utils/logger.js';

export async function adminWorkspaceRoutes(fastify: FastifyInstance) {
	fastify.addHook('preHandler', fastify.authenticate);
	fastify.addHook('preHandler', requireAdmin);

	// Get all workspaces with details
	fastify.get('/', async (request, reply) => {
		try {
			const workspaces = await db
				.select({
					id: organization.id,
					name: organization.name,
					slug: organization.slug,
					createdAt: organization.createdAt,
					subscription: {
						id: organizationSubscriptions.id,
						planId: organizationSubscriptions.planId,
						status: organizationSubscriptions.status,
						currentPeriodStart: organizationSubscriptions.currentPeriodStart,
						currentPeriodEnd: organizationSubscriptions.currentPeriodEnd,
					},
					plan: {
						id: subscriptionPlans.id,
						name: subscriptionPlans.name,
						priceCents: subscriptionPlans.priceCents,
						monthlyConversionLimit: subscriptionPlans.monthlyConversionLimit,
					},
				})
				.from(organization)
				.leftJoin(
					organizationSubscriptions,
					eq(organization.id, organizationSubscriptions.organizationId),
				)
				.leftJoin(subscriptionPlans, eq(organizationSubscriptions.planId, subscriptionPlans.id))
				.orderBy(desc(organization.createdAt));

			// Get usage data for each workspace
			const now = new Date();
			const currentMonth = now.getMonth() + 1;
			const currentYear = now.getFullYear();

			const workspacesWithUsage = await Promise.all(
				workspaces.map(async (workspace) => {
					const usage = await db
						.select({
							conversionCount: usageRecords.conversionCount,
							overageCount: usageRecords.overageCount,
						})
						.from(usageRecords)
						.where(
							and(
								eq(usageRecords.organizationId, workspace.id),
								eq(usageRecords.month, currentMonth),
								eq(usageRecords.year, currentYear),
							),
						)
						.limit(1);

					const memberCount = await db
						.select({ count: sql<number>`count(*)` })
						.from(member)
						.where(eq(member.organizationId, workspace.id))
						.then((rows) => Number(rows[0]?.count || 0));

					const lastActivity = await db
						.select({ lastActivityAt: transformationJobs.createdAt })
						.from(transformationJobs)
						.where(eq(transformationJobs.organizationId, workspace.id))
						.orderBy(desc(transformationJobs.createdAt))
						.limit(1);

					return {
						...workspace,
						currentUsage: usage[0]?.conversionCount || 0,
						overageCount: usage[0]?.overageCount || 0,
						memberCount,
						lastActivityAt: lastActivity[0]?.lastActivityAt || null,
					};
				}),
			);

			// Log admin action
			if (request.currentUser) {
				await adminAuditService.logAdminAction(request.currentUser.id, 'VIEW_WORKSPACES', {
					ipAddress: request.ip,
					userAgent: request.headers['user-agent'],
				});
			}

			return {
				success: true,
				data: workspacesWithUsage,
			};
		} catch (error) {
			logError(request.log, 'Get workspaces error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'GET_WORKSPACES_FAILED',
					message: 'Failed to get workspaces',
				},
			});
		}
	});

	// Get workspace details
	fastify.get('/:workspaceId', async (request, reply) => {
		const { workspaceId } = request.params as { workspaceId: string };

		try {
			const workspace = await db
				.select({
					id: organization.id,
					name: organization.name,
					slug: organization.slug,
					createdAt: organization.createdAt,
					metadata: organization.metadata,
				})
				.from(organization)
				.where(eq(organization.id, workspaceId))
				.limit(1);

			if (!workspace[0]) {
				return reply.code(404).send({
					success: false,
					error: {
						code: 'WORKSPACE_NOT_FOUND',
						message: 'Workspace not found',
					},
				});
			}

			// Get subscription details
			const subscription = await db
				.select()
				.from(organizationSubscriptions)
				.where(eq(organizationSubscriptions.organizationId, workspaceId))
				.limit(1);

			// Get members
			const members = await db
				.select({
					id: member.id,
					userId: member.userId,
					role: member.role,
					createdAt: member.createdAt,
				})
				.from(member)
				.where(eq(member.organizationId, workspaceId));

			// Get usage history
			const usageHistory = await db
				.select()
				.from(usageRecords)
				.where(eq(usageRecords.organizationId, workspaceId))
				.orderBy(desc(usageRecords.year), desc(usageRecords.month))
				.limit(12);

			// Get recent jobs
			const recentJobs = await db
				.select({
					id: transformationJobs.id,
					status: transformationJobs.status,
					originalFileName: transformationJobs.originalFileName,
					createdAt: transformationJobs.createdAt,
					completedAt: transformationJobs.completedAt,
				})
				.from(transformationJobs)
				.where(eq(transformationJobs.organizationId, workspaceId))
				.orderBy(desc(transformationJobs.createdAt))
				.limit(10);

			// Log admin action
			if (request.currentUser) {
				await adminAuditService.logAdminAction(request.currentUser.id, 'VIEW_WORKSPACE_DETAILS', {
					resourceType: 'WORKSPACE',
					resourceId: workspaceId,
					ipAddress: request.ip,
					userAgent: request.headers['user-agent'],
				});
			}

			return {
				success: true,
				data: {
					workspace: workspace[0],
					subscription: subscription[0] || null,
					members,
					usageHistory,
					recentJobs,
				},
			};
		} catch (error) {
			logError(request.log, 'Get workspace details error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'GET_WORKSPACE_FAILED',
					message: 'Failed to get workspace details',
				},
			});
		}
	});

	// Suspend workspace
	fastify.post('/:workspaceId/suspend', async (request, reply) => {
		const { workspaceId } = request.params as { workspaceId: string };

		try {
			await db
				.update(organizationSubscriptions)
				.set({
					status: 'suspended',
				})
				.where(eq(organizationSubscriptions.organizationId, workspaceId));

			// Log admin action
			if (request.currentUser) {
				await adminAuditService.logAdminAction(request.currentUser.id, 'SUSPEND_WORKSPACE', {
					resourceType: 'WORKSPACE',
					resourceId: workspaceId,
					ipAddress: request.ip,
					userAgent: request.headers['user-agent'],
				});
			}

			return {
				success: true,
				message: 'Workspace suspended successfully',
			};
		} catch (error) {
			logError(request.log, 'Suspend workspace error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'SUSPEND_FAILED',
					message: 'Failed to suspend workspace',
				},
			});
		}
	});

	// Activate workspace
	fastify.post('/:workspaceId/activate', async (request, reply) => {
		const { workspaceId } = request.params as { workspaceId: string };

		try {
			await db
				.update(organizationSubscriptions)
				.set({
					status: 'active',
				})
				.where(eq(organizationSubscriptions.organizationId, workspaceId));

			// Log admin action
			if (request.currentUser) {
				await adminAuditService.logAdminAction(request.currentUser.id, 'ACTIVATE_WORKSPACE', {
					resourceType: 'WORKSPACE',
					resourceId: workspaceId,
					ipAddress: request.ip,
					userAgent: request.headers['user-agent'],
				});
			}

			return {
				success: true,
				message: 'Workspace activated successfully',
			};
		} catch (error) {
			logError(request.log, 'Activate workspace error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'ACTIVATE_FAILED',
					message: 'Failed to activate workspace',
				},
			});
		}
	});

	// Update workspace limits
	fastify.post('/:workspaceId/limits', async (request, reply) => {
		const { workspaceId } = request.params as { workspaceId: string };
		const limits = request.body as {
			monthlyConversionLimit?: number | null;
			concurrentConversionLimit?: number | null;
			maxFileSizeMb?: number | null;
			overagePriceCents?: number | null;
		};

		try {
			const updates: Record<string, unknown> = {};
			if (limits.monthlyConversionLimit !== undefined) {
				updates.overrideMonthlyLimit = limits.monthlyConversionLimit;
			}
			if (limits.concurrentConversionLimit !== undefined) {
				updates.overrideConcurrentLimit = limits.concurrentConversionLimit;
			}
			if (limits.maxFileSizeMb !== undefined) {
				updates.overrideMaxFileSizeMb = limits.maxFileSizeMb;
			}
			if (limits.overagePriceCents !== undefined) {
				updates.overrideOveragePriceCents = limits.overagePriceCents;
			}

			await db
				.update(organizationSubscriptions)
				.set(updates)
				.where(eq(organizationSubscriptions.organizationId, workspaceId));

			// Log admin action
			if (request.currentUser) {
				await adminAuditService.logAdminAction(request.currentUser.id, 'UPDATE_WORKSPACE_LIMITS', {
					resourceType: 'WORKSPACE',
					resourceId: workspaceId,
					changes: limits,
					ipAddress: request.ip,
					userAgent: request.headers['user-agent'],
				});
			}

			return {
				success: true,
				message: 'Workspace limits updated successfully',
			};
		} catch (error) {
			logError(request.log, 'Update workspace limits error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'UPDATE_LIMITS_FAILED',
					message: 'Failed to update workspace limits',
				},
			});
		}
	});
}
