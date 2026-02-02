import { useQuery } from '@tanstack/react-query';

import { api } from '@/api/client';
import { useWorkspaceStore } from '@/stores/workspace-store';
import type { SuccessResponse } from '@/types';

type FeaturesResponse = {
	features: string[];
};

export function useFeatureFlag(flagName: string) {
	const { activeWorkspace } = useWorkspaceStore();

	const { data, isLoading } = useQuery({
		queryKey: ['workspace', activeWorkspace?.id, 'features'],
		queryFn: () =>
			api.get<SuccessResponse<FeaturesResponse>>(
				`/v1/workspace/${activeWorkspace!.id}/features`,
			),
		enabled: !!activeWorkspace,
		staleTime: 60_000,
	});

	const features = data?.data?.features ?? [];

	return {
		enabled: features.includes(flagName),
		isLoading,
	};
}
