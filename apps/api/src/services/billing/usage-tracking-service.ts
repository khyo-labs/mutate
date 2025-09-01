import { and, eq, sql } from 'drizzle-orm';
import { ulid } from 'ulid';

import { db } from '../../db/connection.js';
import { activeConversions, usageRecords } from '../../db/schema.js';
import type { BillingPeriod, ConversionEvent, UsageStats } from './types.js';

export class UsageTrackingService {
	async getCurrentBillingPeriod(): Promise<BillingPeriod> {
		const now = new Date();
		const start = new Date(now.getFullYear(), now.getMonth(), 1);
		const end = new Date(
			now.getFullYear(),
			now.getMonth() + 1,
			0,
			23,
			59,
			59,
			999,
		);

		return {
			start,
			end,
			month: now.getMonth() + 1,
			year: now.getFullYear(),
		};
	}

	async getUsageStats(
		organizationId: string,
		monthlyLimit: number | null,
	): Promise<UsageStats> {
		const period = await this.getCurrentBillingPeriod();

		const usageRecord = await db
			.select()
			.from(usageRecords)
			.where(
				and(
					eq(usageRecords.organizationId, organizationId),
					eq(usageRecords.month, period.month),
					eq(usageRecords.year, period.year),
				),
			)
			.limit(1);

		const currentUsage = usageRecord[0]?.conversionCount || 0;
		const overageUsage = usageRecord[0]?.overageCount || 0;

		const activeConversionCount =
			await this.getActiveConversionCount(organizationId);

		return {
			currentUsage,
			overageUsage,
			remainingConversions: monthlyLimit
				? Math.max(0, monthlyLimit - currentUsage)
				: null,
			activeConversions: activeConversionCount,
			maxFileSize: null, // Will be set by quota enforcement service
			resetDate: period.end,
		};
	}

	async recordConversionStart(event: ConversionEvent): Promise<void> {
		await db.insert(activeConversions).values({
			id: ulid(),
			organizationId: event.organizationId,
			jobId: event.jobId,
		});
	}

	async recordConversionComplete(event: ConversionEvent): Promise<void> {
		const period = await this.getCurrentBillingPeriod();

		await db.transaction(async (trx) => {
			await trx
				.delete(activeConversions)
				.where(eq(activeConversions.jobId, event.jobId));

			const existing = await trx
				.select()
				.from(usageRecords)
				.where(
					and(
						eq(usageRecords.organizationId, event.organizationId),
						eq(usageRecords.month, period.month),
						eq(usageRecords.year, period.year),
					),
				)
				.limit(1);

			if (existing.length > 0) {
				const currentBreakdown =
					(existing[0].conversionTypeBreakdown as Record<string, number>) || {};
				const newBreakdown = {
					...currentBreakdown,
					[event.conversionType]:
						(currentBreakdown[event.conversionType] || 0) + 1,
				};

				await trx
					.update(usageRecords)
					.set({
						conversionCount: sql`${usageRecords.conversionCount} + 1`,
						conversionTypeBreakdown: newBreakdown,
						updatedAt: new Date(),
					})
					.where(eq(usageRecords.id, existing[0].id));
			} else {
				await trx.insert(usageRecords).values({
					id: ulid(),
					organizationId: event.organizationId,
					month: period.month,
					year: period.year,
					conversionCount: 1,
					overageCount: 0,
					conversionTypeBreakdown: {
						[event.conversionType]: 1,
					},
				});
			}
		});
	}

	async recordOverageConversion(event: ConversionEvent): Promise<void> {
		const period = await this.getCurrentBillingPeriod();

		await db
			.update(usageRecords)
			.set({
				overageCount: sql`${usageRecords.overageCount} + 1`,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(usageRecords.organizationId, event.organizationId),
					eq(usageRecords.month, period.month),
					eq(usageRecords.year, period.year),
				),
			);

		await this.recordConversionComplete(event);
	}

	async recordConversionFailure(
		organizationId: string,
		jobId: string,
	): Promise<void> {
		await db
			.delete(activeConversions)
			.where(
				and(
					eq(activeConversions.organizationId, organizationId),
					eq(activeConversions.jobId, jobId),
				),
			);
	}

	async getActiveConversionCount(organizationId: string): Promise<number> {
		const result = await db
			.select({ count: sql<number>`count(*)` })
			.from(activeConversions)
			.where(eq(activeConversions.organizationId, organizationId));

		return result[0].count;
	}

	async getUsageHistory(organizationId: string, limit: number = 12) {
		return await db
			.select()
			.from(usageRecords)
			.where(eq(usageRecords.organizationId, organizationId))
			.orderBy(sql`${usageRecords.year} DESC, ${usageRecords.month} DESC`)
			.limit(limit);
	}

	async resetMonthlyUsage(): Promise<void> {
		const previousMonth = new Date();
		previousMonth.setMonth(previousMonth.getMonth() - 1);

		console.log(
			'🔄 Monthly usage reset completed for',
			previousMonth.toISOString().substring(0, 7),
		);
	}
}

export const usageTrackingService = new UsageTrackingService();
