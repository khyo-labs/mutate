import { type UseQueryOptions, useQuery } from '@tanstack/react-query';

import {
	type OrganizationSubscription,
	type QuotaStatus,
	type SubscriptionPlan,
	type UsageHistory,
	billingApi,
} from '@/api/billing';
import { useWorkspaceStore } from '@/stores/workspace-store';

export function useSubscriptionPlans(
	options?: UseQueryOptions<{ success: boolean; data: SubscriptionPlan[] }>,
) {
	return useQuery({
		queryKey: ['subscription-plans'],
		queryFn: () => billingApi.getPlans(),
		...options,
	});
}

export function useOrganizationSubscription(
	options?: UseQueryOptions<{
		success: boolean;
		data: OrganizationSubscription;
	}>,
) {
	const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);

	return useQuery({
		queryKey: ['organization-subscription', activeWorkspace?.id],
		queryFn: () => billingApi.getSubscription(),
		enabled: !!activeWorkspace,
		...options,
	});
}

export function useQuotaStatus(
	options?: UseQueryOptions<{ success: boolean; data: QuotaStatus }>,
) {
	const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);

	return useQuery({
		queryKey: ['quota-status', activeWorkspace?.id],
		queryFn: () => billingApi.getUsage(),
		enabled: !!activeWorkspace,
		refetchInterval: 30000, // Refetch every 30 seconds
		...options,
	});
}

export function useUsageHistory(
	limit = 12,
	options?: UseQueryOptions<{ success: boolean; data: UsageHistory[] }>,
) {
	const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);

	return useQuery({
		queryKey: ['usage-history', activeWorkspace?.id, limit],
		queryFn: () => billingApi.getUsageHistory(limit),
		enabled: !!activeWorkspace,
		...options,
	});
}