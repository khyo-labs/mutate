import { api } from './client';

export type SubscriptionPlan = {
	id: string;
	name: string;
	monthlyConversionLimit: number | null;
	concurrentConversionLimit: number | null;
	maxFileSizeMb: number | null;
	priceCents: number;
	billingInterval: string;
	overagePriceCents: number | null;
	features: Record<string, unknown> | null;
	active: boolean;
	isDefault: boolean;
	isPublic: boolean;
};

export type OrganizationSubscription = {
	id: string;
	organizationId: string;
	planId: string;
	plan?: SubscriptionPlan;
	status: string;
	currentPeriodStart: string;
	currentPeriodEnd: string;
	overrideMonthlyLimit: number | null;
	overrideConcurrentLimit: number | null;
	overrideMaxFileSizeMb: number | null;
	overrideOveragePriceCents: number | null;
};

export type QuotaStatus = {
	subscription: {
		planName: string;
		status: string;
	} | null;
	usage: {
		currentMonth: number;
		currentMonthOverage: number;
		activeConversions: number;
	};
	limits: {
		monthly: number;
		concurrent: number;
		maxFileSizeMb: number;
	};
	remaining: {
		monthly: number;
		concurrent: number;
	};
	periodEnd: string;
	warnings: string[];
};

export type UsageHistory = {
	month: number;
	year: number;
	conversionCount: number;
	overageCount: number;
	conversionTypeBreakdown?: Record<string, number>;
};

export type ApiResponse<T> = {
	success: boolean;
	data: T;
};

export const billingApi = {
	getPlans: async (): Promise<ApiResponse<SubscriptionPlan[]>> => {
		return api.get('/v1/billing/plans');
	},

	getSubscription: async (): Promise<ApiResponse<OrganizationSubscription>> => {
		return api.get('/v1/billing/subscription');
	},

	getUsage: async (): Promise<ApiResponse<QuotaStatus>> => {
		return api.get('/v1/billing/usage');
	},

	getUsageHistory: async (limit = 12): Promise<ApiResponse<UsageHistory[]>> => {
		return api.get(`/v1/billing/usage/history?limit=${limit}`);
	},

	updateSubscription: async (
		planId: string,
	): Promise<ApiResponse<OrganizationSubscription>> => {
		return api.post('/v1/billing/subscription', { planId });
	},
};
