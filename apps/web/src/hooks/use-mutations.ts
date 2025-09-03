import { type UseQueryOptions, useQuery } from '@tanstack/react-query';

import { workspaceApi } from '@/api/workspaces';
import { useWorkspaceStore } from '@/stores/workspace-store';

import type { Configuration, PaginatedResponse } from '../types';

export function useMutations(
	params?: { page?: number; limit?: number; search?: string },
	options?: UseQueryOptions<PaginatedResponse<Configuration>>,
) {
	const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);

	return useQuery({
		queryKey: ['mutations', activeWorkspace?.id, params],
		queryFn: () => workspaceApi.getMutations(activeWorkspace!.id, params),
		enabled: !!activeWorkspace,
		...options,
	});
}
