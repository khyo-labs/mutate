import { and, eq } from 'drizzle-orm';
import { ulid } from 'ulid';

import { db } from '../../db/connection.js';
import {
	organization,
	organizationSubscriptions,
	subscriptionPlans,
	usageRecords,
} from '../../db/schema.js';
import type { ConversionLimits } from './types.js';

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
			await this.assignFreePlan(organizationId);
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

	async assignFreePlan(organizationId: string) {
		const now = new Date();
		const periodEnd = new Date(now);
		periodEnd.setMonth(periodEnd.getMonth() + 1);

		await db.insert(organizationSubscriptions).values({
			id: ulid(),
			organizationId,
			planId: 'plan_free',
			status: 'active',
			currentPeriodStart: now,
			currentPeriodEnd: periodEnd,
		});
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

	async getAllPlans() {
		return await db
			.select()
			.from(subscriptionPlans)
			.where(eq(subscriptionPlans.active, true))
			.orderBy(subscriptionPlans.priceCents);
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
