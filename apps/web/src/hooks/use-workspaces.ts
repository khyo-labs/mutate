import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type CreateWorkspaceRequest, workspaceApi } from '../api/workspaces';

const queryKey = ['workspaces'];

export function useCreateWorkspace() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateWorkspaceRequest) => workspaceApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKey,
			});
		},
	});
}

export function useListWorkspace() {
	return useQuery({
		queryKey: queryKey,
		queryFn: () => workspaceApi.list(),
	});
}

export function useCheckSlugExists() {
	return useMutation({
		mutationFn: (slug: string) => workspaceApi.isSlugAvailable(slug),
	});
}
