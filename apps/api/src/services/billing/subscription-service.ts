import { and, eq } from 'drizzle-orm';
import { ulid } from 'ulid';

import { db } from '@/db/connection.js';
import {
	organization,
	organizationSubscriptions,
	subscriptionPlans,
	usageRecords,
} from '@/db/schema.js';
import type { ConversionLimits } from '@/services/billing/types.js';

export class SubscriptionService {
	async getOrganizationLimits(
		organizationId: string,
	): Promise<ConversionLimits> {
		const subscription = await db
			.select()
			.from(organizationSubscriptions)
			.innerJoin(
				subscriptionPlans,
				eq(organizationSubscriptions.planId, subscriptionPlans.id),
			)
			.where(eq(organizationSubscriptions.organizationId, organizationId))
			.limit(1);

		if (!subscription.length) {
			await this.assignDefaultPlan(organizationId);
			return this.getDefaultFreeLimits();
		}

		const { organization_subscription: orgSub, subscription_plan: plan } =
			subscription[0];

		return {
			monthlyConversionLimit:
				orgSub.overrideMonthlyLimit ?? plan.monthlyConversionLimit,
			concurrentConversionLimit:
				orgSub.overrideConcurrentLimit ?? plan.concurrentConversionLimit,
			maxFileSizeMb: orgSub.overrideMaxFileSizeMb ?? plan.maxFileSizeMb,
			overagePriceCents:
				orgSub.overrideOveragePriceCents ?? plan.overagePriceCents,
		};
	}

	async getOrganizationSubscription(organizationId: string) {
		const subscription = await db
			.select()
			.from(organizationSubscriptions)
			.innerJoin(
				subscriptionPlans,
				eq(organizationSubscriptions.planId, subscriptionPlans.id),
			)
			.where(eq(organizationSubscriptions.organizationId, organizationId))
			.limit(1);

		return subscription[0] || null;
	}

	async assignDefaultPlan(organizationId: string) {
		const defaultPlan = await this.getDefaultPlan();
		if (!defaultPlan) {
			throw new Error('No default plan configured');
		}

		const now = new Date();
		const periodEnd = new Date(now);
		periodEnd.setMonth(periodEnd.getMonth() + 1);

		await db.insert(organizationSubscriptions).values({
			id: ulid(),
			organizationId,
			planId: defaultPlan.id,
			status: 'active',
			currentPeriodStart: now,
			currentPeriodEnd: periodEnd,
		});
	}

	// Keep old method for backward compatibility but redirect to new one
	async assignFreePlan(organizationId: string) {
		return this.assignDefaultPlan(organizationId);
	}

	async upgradePlan(organizationId: string, newPlanId: string) {
		const subscription = await this.getOrganizationSubscription(organizationId);

		if (!subscription) {
			const now = new Date();
			const periodEnd = new Date(now);
			periodEnd.setMonth(periodEnd.getMonth() + 1);

			await db.insert(organizationSubscriptions).values({
				id: ulid(),
				organizationId,
				planId: newPlanId,
				status: 'active',
				currentPeriodStart: now,
				currentPeriodEnd: periodEnd,
			});
		} else {
			await db
				.update(organizationSubscriptions)
				.set({ planId: newPlanId })
				.where(eq(organizationSubscriptions.organizationId, organizationId));
		}
	}

	async setOrganizationOverrides(
		organizationId: string,
		overrides: Partial<ConversionLimits>,
	) {
		await db
			.update(organizationSubscriptions)
			.set({
				overrideMonthlyLimit: overrides.monthlyConversionLimit,
				overrideConcurrentLimit: overrides.concurrentConversionLimit,
				overrideMaxFileSizeMb: overrides.maxFileSizeMb,
				overrideOveragePriceCents: overrides.overagePriceCents,
			})
			.where(eq(organizationSubscriptions.organizationId, organizationId));
	}

	async getAllPlans(includePrivate = false) {
		const conditions = [eq(subscriptionPlans.active, true)];
		if (!includePrivate) {
			conditions.push(eq(subscriptionPlans.isPublic, true));
		}

		return await db
			.select()
			.from(subscriptionPlans)
			.where(and(...conditions))
			.orderBy(subscriptionPlans.priceCents);
	}

	async getDefaultPlan() {
		const plans = await db
			.select()
			.from(subscriptionPlans)
			.where(
				and(
					eq(subscriptionPlans.active, true),
					eq(subscriptionPlans.isDefault, true),
				),
			)
			.limit(1);

		return plans[0] || null;
	}

	async getPlanById(planId: string) {
		const plans = await db
			.select()
			.from(subscriptionPlans)
			.where(eq(subscriptionPlans.id, planId))
			.limit(1);

		return plans[0] || null;
	}

	async createPlan(plan: {
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
	}) {
		const id = `plan_${plan.name.toLowerCase().replace(/\s+/g, '_')}_${ulid()}`;

		// If setting as default, unset other defaults first
		if (plan.isDefault) {
			await db
				.update(subscriptionPlans)
				.set({ isDefault: false })
				.where(eq(subscriptionPlans.isDefault, true));
		}

		const [newPlan] = await db
			.insert(subscriptionPlans)
			.values({
				id,
				...plan,
				isDefault: plan.isDefault ?? false,
				isPublic: plan.isPublic ?? true,
			})
			.returning();

		return newPlan;
	}

	async updatePlan(
		planId: string,
		updates: Partial<{
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
		}>,
	) {
		// If setting as default, unset other defaults first
		if (updates.isDefault === true) {
			await db
				.update(subscriptionPlans)
				.set({ isDefault: false })
				.where(eq(subscriptionPlans.isDefault, true));
		}

		const [updatedPlan] = await db
			.update(subscriptionPlans)
			.set({
				...updates,
				updatedAt: new Date(),
			})
			.where(eq(subscriptionPlans.id, planId))
			.returning();

		return updatedPlan;
	}

	async deletePlan(planId: string) {
		// Check if plan is in use
		const subscriptionsUsingPlan = await db
			.select()
			.from(organizationSubscriptions)
			.where(eq(organizationSubscriptions.planId, planId))
			.limit(1);

		if (subscriptionsUsingPlan.length > 0) {
			throw new Error('Cannot delete plan that is currently in use');
		}

		// Check if it's the default plan
		const plan = await db
			.select()
			.from(subscriptionPlans)
			.where(eq(subscriptionPlans.id, planId))
			.limit(1);

		if (plan[0]?.isDefault) {
			throw new Error('Cannot delete the default plan');
		}

		await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, planId));
	}

	async getAllOrganizationsWithUsage() {
		const orgs = await db
			.select({
				id: organization.id,
				name: organization.name,
				createdAt: organization.createdAt,
				subscription: organizationSubscriptions,
				plan: subscriptionPlans,
			})
			.from(organization)
			.leftJoin(
				organizationSubscriptions,
				eq(organization.id, organizationSubscriptions.organizationId),
			)
			.leftJoin(
				subscriptionPlans,
				eq(organizationSubscriptions.planId, subscriptionPlans.id),
			);

		// Get usage for each organization
		const orgsWithUsage = await Promise.all(
			orgs.map(async (org) => {
				const period = await this.getCurrentBillingPeriod();
				const usageRecord = await db
					.select()
					.from(usageRecords)
					.where(
						and(
							eq(usageRecords.organizationId, org.id),
							eq(usageRecords.month, period.month),
							eq(usageRecords.year, period.year),
						),
					)
					.limit(1);

				return {
					...org,
					currentUsage: usageRecord[0]?.conversionCount || 0,
					overageCount: usageRecord[0]?.overageCount || 0,
				};
			}),
		);

		return orgsWithUsage;
	}

	private async getCurrentBillingPeriod() {
		const now = new Date();
		return {
			month: now.getMonth() + 1,
			year: now.getFullYear(),
		};
	}

	private getDefaultFreeLimits(): ConversionLimits {
		return {
			monthlyConversionLimit: 100,
			concurrentConversionLimit: 1,
			maxFileSizeMb: 10,
			overagePriceCents: null,
		};
	}
}

export const subscriptionService = new SubscriptionService();
