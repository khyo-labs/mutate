import { FastifyInstance } from 'fastify';

import { requireAdmin } from '@/middleware/auth.js';
import {
	QuotaEnforcementService,
	SubscriptionService,
} from '@/services/billing/index.js';
import '@/types/fastify.js';
import { logError } from '@/utils/logger.js';

export async function adminBillingRoutes(fastify: FastifyInstance) {
	fastify.addHook('preHandler', fastify.authenticate);
	fastify.addHook('preHandler', requireAdmin);

	const subscriptionService = new SubscriptionService();
	const quotaService = new QuotaEnforcementService();

	fastify.get('/plans', async (request, reply) => {
		try {
			const plans = await subscriptionService.getAllPlans(true);

			return {
				success: true,
				data: plans,
			};
		} catch (error) {
			logError(request.log, 'Get all plans error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'GET_PLANS_FAILED',
					message: 'Failed to get all plans',
				},
			});
		}
	});

	fastify.post('/plans', async (request, reply) => {
		try {
			const planData = request.body as {
				name: string;
				monthlyConversionLimit: number | null;
				concurrentConversionLimit: number | null;
				maxFileSizeMb: number | null;
				priceCents: number;
				billingInterval: string;
				overagePriceCents: number | null;
				features: Record<string, unknown> | null;
				isDefault?: boolean;
				isPublic?: boolean;
			};

			const newPlan = await subscriptionService.createPlan(planData);

			return {
				success: true,
				data: newPlan,
			};
		} catch (error) {
			logError(request.log, 'Create plan error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'CREATE_PLAN_FAILED',
					message: 'Failed to create plan',
				},
			});
		}
	});

	fastify.put('/plans/:planId', async (request, reply) => {
		try {
			const { planId } = request.params as { planId: string };
			const updates = request.body as Partial<{
				name: string;
				monthlyConversionLimit: number | null;
				concurrentConversionLimit: number | null;
				maxFileSizeMb: number | null;
				priceCents: number;
				billingInterval: string;
				overagePriceCents: number | null;
				features: Record<string, unknown> | null;
				isDefault: boolean;
				isPublic: boolean;
				active: boolean;
			}>;

			const updatedPlan = await subscriptionService.updatePlan(planId, updates);

			return {
				success: true,
				data: updatedPlan,
			};
		} catch (error) {
			logError(request.log, 'Update plan error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'UPDATE_PLAN_FAILED',
					message: 'Failed to update plan',
				},
			});
		}
	});

	fastify.delete('/plans/:planId', async (request, reply) => {
		try {
			const { planId } = request.params as { planId: string };

			await subscriptionService.deletePlan(planId);

			return {
				success: true,
				message: 'Plan deleted successfully',
			};
		} catch (error) {
			logError(request.log, 'Delete plan error:', error);
			const message =
				error instanceof Error ? error.message : 'Failed to delete plan';
			return reply.code(400).send({
				success: false,
				error: {
					code: 'DELETE_PLAN_FAILED',
					message,
				},
			});
		}
	});

	fastify.put('/plans/:planId/default', async (request, reply) => {
		try {
			const { planId } = request.params as { planId: string };

			const updatedPlan = await subscriptionService.updatePlan(planId, {
				isDefault: true,
			});

			return {
				success: true,
				data: updatedPlan,
			};
		} catch (error) {
			logError(request.log, 'Set default plan error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'SET_DEFAULT_FAILED',
					message: 'Failed to set default plan',
				},
			});
		}
	});

	fastify.get('/workspaces', async (request, reply) => {
		try {
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

	fastify.get('/workspaces/:orgId', async (request, reply) => {
		try {
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

	fastify.post('/workspaces/:orgId/subscription', async (request, reply) => {
		try {
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
	});

	fastify.post('/workspaces/:orgId/overrides', async (request, reply) => {
		try {
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
}
