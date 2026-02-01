import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useSession } from '@/stores/auth-store';
import { useWorkspaceStore } from '@/stores/workspace-store';

import {
	type CreateWorkspaceRequest,
	type UpdateWorkspaceRequest,
	type Workspace,
	workspaceApi,
} from '../api/workspaces';

const queryKey = ['workspaces'];

type CheckWorkspaceNamePayload = {
	name: string;
	workspaceId?: string;
};

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
	const { data: session } = useSession();

	return useQuery({
		queryKey: [...queryKey, activeWorkspace?.id],
		queryFn: () => workspaceApi.list(),
		enabled: !!session?.user,
	});
}

export function useCheckSlugExists() {
	return useMutation({
		mutationFn: (slug: string) => workspaceApi.isSlugAvailable(slug),
	});
}

export function useCheckWorkspaceName() {
	return useMutation({
		mutationFn: ({ name, workspaceId }: CheckWorkspaceNamePayload) =>
			workspaceApi.isNameAvailable(name, workspaceId),
	});
}

export function useUpdateWorkspace() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ workspaceId, data }: { workspaceId: string; data: UpdateWorkspaceRequest }) =>
			workspaceApi.update(workspaceId, data),
		onSuccess: (workspace: Workspace) => {
			useWorkspaceStore.setState((state) => {
				const workspaces = state.workspaces.some((ws) => ws.id === workspace.id)
					? state.workspaces.map((ws) => (ws.id === workspace.id ? workspace : ws))
					: [...state.workspaces, workspace];

				return {
					workspaces,
					activeWorkspace:
						state.activeWorkspace?.id === workspace.id ? workspace : state.activeWorkspace,
				};
			});

			queryClient.invalidateQueries({ queryKey });
			queryClient.invalidateQueries({
				queryKey: [...queryKey, workspace?.id],
			});

			toast.success('Workspace updated successfully');
		},
		onError: () => {
			toast.error('Failed to update workspace');
		},
	});
}
