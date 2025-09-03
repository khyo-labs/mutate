import { create } from 'zustand';

import { api } from '@/api/client';
import type { Workspace } from '@/api/workspaces';
import { queryClient } from '@/lib/query-client';

type WorkspaceStore = {
	isLoading: boolean;
	workspaces: Workspace[];
	activeWorkspace: Workspace | null;
	setWorkspaces: (workspaces: Workspace[]) => void;
	setActiveWorkspace: (worksapce: Workspace) => void;
	setLoading: (isLoading: boolean) => void;
};

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
	isLoading: false,
	workspaces: [],
	activeWorkspace: null,
	setWorkspaces: (organizations: Workspace[]) => {
		set({ workspaces: organizations });
	},
	setActiveWorkspace: async (organization: Workspace) => {
		const previousActiveWorkspace = get().activeWorkspace;
		try {
			set({ activeWorkspace: organization });

			// Invalidate all workspace-scoped queries when switching workspaces
			// This ensures fresh data is fetched for the new workspace
			await queryClient.invalidateQueries({ queryKey: ['mutations'] });
			await queryClient.invalidateQueries({ queryKey: ['api-keys'] });
			await queryClient.invalidateQueries({ queryKey: ['webhooks'] });
			await queryClient.invalidateQueries({ queryKey: ['workspace'] });

			// Also call our API to persist the change
			await api.post('/v1/workspaces/set-active', {
				organizationId: organization.id,
			});
		} catch (error) {
			console.error('Failed to set active workspace:', error);
			// If there's an error, revert to the previous active workspace
			set({ activeWorkspace: previousActiveWorkspace });
		}
	},
	setLoading: (isLoading: boolean) => {
		set({ isLoading });
	},
}));
