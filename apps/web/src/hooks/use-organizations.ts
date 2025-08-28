import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
	type CreateOrganizationRequest,
	workspaceApi,
} from '../api/workspaces';

export function useCreateWorkspace() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateOrganizationRequest) => workspaceApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['organizations'],
			});
		},
	});
}

export function useListWorkspace() {
	return useQuery({
		queryKey: ['organizations'],
		queryFn: () => workspaceApi.list(),
		initialData: [],
	});
}

export function useCheckSlugExists() {
	return useMutation({
		mutationFn: (slug: string) => workspaceApi.isSlugAvailable(slug),
	});
}
