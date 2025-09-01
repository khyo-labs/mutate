import { FastifyInstance } from 'fastify';

import {
	QuotaEnforcementService,
	SubscriptionService,
	UsageTrackingService,
} from '../services/billing/index.js';
import '../types/fastify.js';
import { logError } from '../utils/logger.js';

export async function billingRoutes(fastify: FastifyInstance) {
	const subscriptionService = new SubscriptionService();

	fastify.get('/plans/public', async (request, reply) => {
		try {
			const plans = await subscriptionService.getAllPlans(false);

			return {
				success: true,
				data: plans,
			};
		} catch (error) {
			logError(request.log, 'Get public plans error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'PUBLIC_PLANS_FAILED',
					message: 'Failed to get public subscription plans',
				},
			});
		}
	});

	fastify.addHook('preHandler', fastify.authenticate);

	const usageService = new UsageTrackingService();
	const quotaService = new QuotaEnforcementService();

	// Get subscription plans (public only for regular users, all for admins)
	fastify.get('/plans', async (request, reply) => {
		try {
			const includePrivate = request.currentUser?.isPlatformAdmin || false;
			const plans = await subscriptionService.getAllPlans(includePrivate);

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
				// Auto-assign default plan if none exists
				await subscriptionService.assignDefaultPlan(organizationId);
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
}
