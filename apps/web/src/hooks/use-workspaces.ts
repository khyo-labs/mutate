import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useWorkspaceStore } from '@/stores/workspace-store';

import {
	type CreateWorkspaceRequest,
	type Workspace,
	workspaceApi,
} from '../api/workspaces';

const queryKey = ['workspaces'];

export function useCreateWorkspace() {
	const queryClient = useQueryClient();
	const { setActiveWorkspace } = useWorkspaceStore();

	return useMutation({
		mutationFn: (data: CreateWorkspaceRequest) => workspaceApi.create(data),
		onSuccess: (workspace: Workspace) => {
			queryClient.invalidateQueries({
				queryKey: [...queryKey, workspace?.id],
			});
			setActiveWorkspace(workspace);
		},
	});
}

export function useListWorkspace() {
	const { activeWorkspace } = useWorkspaceStore();

	return useQuery({
		queryKey: [...queryKey, activeWorkspace?.id],
		queryFn: () => workspaceApi.list(),
	});
}

export function useCheckSlugExists() {
	return useMutation({
		mutationFn: (slug: string) => workspaceApi.isSlugAvailable(slug),
	});
}
