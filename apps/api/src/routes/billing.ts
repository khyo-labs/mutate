import { FastifyInstance } from 'fastify';

import { authenticateSession } from '../middleware/auth.js';
import {
	QuotaEnforcementService,
	SubscriptionService,
	UsageTrackingService,
} from '../services/billing/index.js';
import '../types/fastify.js';
import { logError } from '../utils/logger.js';

export async function billingRoutes(fastify: FastifyInstance) {
	fastify.addHook('preHandler', authenticateSession);

	const subscriptionService = new SubscriptionService();
	const usageService = new UsageTrackingService();
	const quotaService = new QuotaEnforcementService();

	// Get subscription plans
	fastify.get('/plans', async (request, reply) => {
		try {
			const plans = await subscriptionService.getAllPlans();

			return {
				success: true,
				data: plans,
			};
		} catch (error) {
			logError(request.log, 'Get plans error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'PLANS_FAILED',
					message: 'Failed to get subscription plans',
				},
			});
		}
	});

	// Get organization subscription
	fastify.get('/subscription', async (request, reply) => {
		try {
			const organizationId = request.currentUser?.organizationId;
			if (!organizationId) {
				return reply.code(401).send({
					success: false,
					error: 'No active organization',
				});
			}

			const subscription =
				await subscriptionService.getOrganizationSubscription(organizationId);

			if (!subscription) {
				// Auto-assign free plan if none exists
				await subscriptionService.assignFreePlan(organizationId);
				const newSubscription =
					await subscriptionService.getOrganizationSubscription(organizationId);

				return {
					success: true,
					data: newSubscription,
				};
			}

			return {
				success: true,
				data: subscription,
			};
		} catch (error) {
			logError(request.log, 'Get subscription error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'SUBSCRIPTION_FAILED',
					message: 'Failed to get subscription',
				},
			});
		}
	});

	// Update organization subscription plan
	fastify.post('/subscription', async (request, reply) => {
		try {
			const organizationId = request.currentUser?.organizationId;
			if (!organizationId) {
				return reply.code(401).send({
					success: false,
					error: 'No active organization',
				});
			}

			const { planId } = request.body as { planId: string };

			if (!planId) {
				return reply.code(400).send({
					success: false,
					error: {
						code: 'PLAN_ID_REQUIRED',
						message: 'Plan ID is required',
					},
				});
			}

			await subscriptionService.upgradePlan(organizationId, planId);
			const subscription =
				await subscriptionService.getOrganizationSubscription(organizationId);

			return {
				success: true,
				data: subscription,
			};
		} catch (error) {
			logError(request.log, 'Update subscription error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'SUBSCRIPTION_UPDATE_FAILED',
					message: 'Failed to update subscription',
				},
			});
		}
	});

	// Get usage statistics and quota status
	fastify.get('/usage', async (request, reply) => {
		try {
			const organizationId = request.currentUser?.organizationId;
			if (!organizationId) {
				return reply.code(401).send({
					success: false,
					error: 'No active organization',
				});
			}

			const quotaStatus = await quotaService.getQuotaStatus(organizationId);

			return {
				success: true,
				data: quotaStatus,
			};
		} catch (error) {
			logError(request.log, 'Get usage error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'USAGE_FAILED',
					message: 'Failed to get usage statistics',
				},
			});
		}
	});

	// Get usage history
	fastify.get('/usage/history', async (request, reply) => {
		try {
			const organizationId = request.currentUser?.organizationId;
			if (!organizationId) {
				return reply.code(401).send({
					success: false,
					error: 'No active organization',
				});
			}

			const { limit } = request.query as { limit?: string };
			const usageHistory = await usageService.getUsageHistory(
				organizationId,
				limit ? parseInt(limit, 10) : 12,
			);

			return {
				success: true,
				data: usageHistory,
			};
		} catch (error) {
			logError(request.log, 'Get usage history error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'USAGE_HISTORY_FAILED',
					message: 'Failed to get usage history',
				},
			});
		}
	});

	// Platform Admin endpoint: Set workspace overrides
	fastify.post('/admin/workspaces/:orgId/overrides', async (request, reply) => {
		try {
			// Check for platform admin access
			if (!request.currentUser?.isPlatformAdmin) {
				return reply.code(403).send({
					success: false,
					error: 'Platform admin access required',
				});
			}

			const { orgId } = request.params as { orgId: string };
			const overrides = request.body as {
				monthlyConversionLimit?: number | null;
				concurrentConversionLimit?: number | null;
				maxFileSizeMb?: number | null;
				overagePriceCents?: number | null;
			};

			await subscriptionService.setOrganizationOverrides(orgId, overrides);

			return {
				success: true,
				message: 'Organization overrides updated successfully',
			};
		} catch (error) {
			logError(request.log, 'Set overrides error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'OVERRIDES_FAILED',
					message: 'Failed to set organization overrides',
				},
			});
		}
	});

	// Platform Admin endpoint: Get all workspaces with usage stats
	fastify.get('/admin/workspaces', async (request, reply) => {
		try {
			// Check for platform admin access
			if (!request.currentUser?.isPlatformAdmin) {
				return reply.code(403).send({
					success: false,
					error: 'Platform admin access required',
				});
			}

			const organizations =
				await subscriptionService.getAllOrganizationsWithUsage();

			return {
				success: true,
				data: organizations,
			};
		} catch (error) {
			logError(request.log, 'Get all organizations error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'GET_ORGANIZATIONS_FAILED',
					message: 'Failed to get organizations',
				},
			});
		}
	});

	// Platform Admin endpoint: Update organization subscription
	fastify.post(
		'/admin/workspaces/:orgId/subscription',
		async (request, reply) => {
			try {
				// Check for platform admin access
				if (!request.currentUser?.isPlatformAdmin) {
					return reply.code(403).send({
						success: false,
						error: 'Platform admin access required',
					});
				}

				const { orgId } = request.params as { orgId: string };
				const { planId } = request.body as { planId: string };

				if (!planId) {
					return reply.code(400).send({
						success: false,
						error: {
							code: 'PLAN_ID_REQUIRED',
							message: 'Plan ID is required',
						},
					});
				}

				await subscriptionService.upgradePlan(orgId, planId);
				const subscription =
					await subscriptionService.getOrganizationSubscription(orgId);

				return {
					success: true,
					data: subscription,
				};
			} catch (error) {
				logError(request.log, 'Update org subscription error:', error);
				return reply.code(500).send({
					success: false,
					error: {
						code: 'SUBSCRIPTION_UPDATE_FAILED',
						message: 'Failed to update organization subscription',
					},
				});
			}
		},
	);

	// Platform Admin endpoint: Get organization limits and usage
	fastify.get('/admin/workspaces/:orgId', async (request, reply) => {
		try {
			// Check for platform admin access
			if (!request.currentUser?.isPlatformAdmin) {
				return reply.code(403).send({
					success: false,
					error: 'Platform admin access required',
				});
			}

			const { orgId } = request.params as { orgId: string };

			const [subscription, quotaStatus] = await Promise.all([
				subscriptionService.getOrganizationSubscription(orgId),
				quotaService.getQuotaStatus(orgId),
			]);

			return {
				success: true,
				data: {
					subscription,
					...quotaStatus,
				},
			};
		} catch (error) {
			logError(request.log, 'Get org admin data error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'ADMIN_DATA_FAILED',
					message: 'Failed to get organization data',
				},
			});
		}
	});
}
