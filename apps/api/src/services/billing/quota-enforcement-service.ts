import { SubscriptionService } from './subscription-service.js';
import type {
	ConversionLimits,
	QuotaValidationResult,
	UsageStats,
} from './types.js';
import { UsageTrackingService } from './usage-tracking-service.js';

export class QuotaEnforcementService {
	private subscriptionService: SubscriptionService;
	private usageTrackingService: UsageTrackingService;

	constructor() {
		this.subscriptionService = new SubscriptionService();
		this.usageTrackingService = new UsageTrackingService();
	}

	async validateConversionQuota(
		organizationId: string,
		fileSizeMb: number,
	): Promise<QuotaValidationResult> {
		const limits =
			await this.subscriptionService.getOrganizationLimits(organizationId);
		const usage = await this.usageTrackingService.getUsageStats(
			organizationId,
			limits.monthlyConversionLimit,
		);

		usage.maxFileSize = limits.maxFileSizeMb;

		// Check file size limit
		if (limits.maxFileSizeMb && fileSizeMb > limits.maxFileSizeMb) {
			return {
				canProceed: false,
				reason: `File size (${fileSizeMb}MB) exceeds plan limit of ${limits.maxFileSizeMb}MB`,
				limits,
				usage,
			};
		}

		// Check concurrent conversion limit
		if (
			limits.concurrentConversionLimit &&
			usage.activeConversions >= limits.concurrentConversionLimit
		) {
			return {
				canProceed: false,
				reason: `Concurrent conversion limit reached (${limits.concurrentConversionLimit})`,
				limits,
				usage,
			};
		}

		// Check monthly conversion limit
		if (
			limits.monthlyConversionLimit &&
			usage.currentUsage >= limits.monthlyConversionLimit
		) {
			// If overage pricing is available, allow conversion
			if (limits.overagePriceCents) {
				return {
					canProceed: true,
					reason: `Conversion will be charged as overage (${limits.overagePriceCents} cents)`,
					limits,
					usage,
				};
			} else {
				return {
					canProceed: false,
					reason: `Monthly conversion limit reached (${limits.monthlyConversionLimit})`,
					limits,
					usage,
				};
			}
		}

		// All checks passed
		return {
			canProceed: true,
			limits,
			usage,
		};
	}

	async validateAndReserveSlot(
		organizationId: string,
		fileSizeMb: number,
	): Promise<QuotaValidationResult> {
		const validation = await this.validateConversionQuota(
			organizationId,
			fileSizeMb,
		);

		if (!validation.canProceed) {
			return validation;
		}

		return validation;
	}

	async isOverageConversion(organizationId: string): Promise<boolean> {
		const limits =
			await this.subscriptionService.getOrganizationLimits(organizationId);
		const usage = await this.usageTrackingService.getUsageStats(
			organizationId,
			limits.monthlyConversionLimit,
		);

		return limits.monthlyConversionLimit
			? usage.currentUsage >= limits.monthlyConversionLimit
			: false;
	}

	async getQuotaStatus(organizationId: string): Promise<{
		limits: ConversionLimits;
		usage: UsageStats;
		warnings: string[];
	}> {
		const limits =
			await this.subscriptionService.getOrganizationLimits(organizationId);
		const usage = await this.usageTrackingService.getUsageStats(
			organizationId,
			limits.monthlyConversionLimit,
		);

		usage.maxFileSize = limits.maxFileSizeMb;

		const warnings: string[] = [];

		// Generate warnings based on usage thresholds
		if (limits.monthlyConversionLimit && usage.remainingConversions !== null) {
			const usagePercentage =
				(usage.currentUsage / limits.monthlyConversionLimit) * 100;

			if (usagePercentage >= 90) {
				warnings.push('You have used 90% of your monthly conversions');
			} else if (usagePercentage >= 80) {
				warnings.push('You have used 80% of your monthly conversions');
			}
		}

		if (
			limits.concurrentConversionLimit &&
			usage.activeConversions >= limits.concurrentConversionLimit * 0.8
		) {
			warnings.push('Approaching concurrent conversion limit');
		}

		return {
			limits,
			usage,
			warnings,
		};
	}
}
