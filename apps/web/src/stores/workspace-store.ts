import { create } from 'zustand';

import type { Workspace } from '@/api/workspaces';
import { authClient } from '@/lib/auth-client';

type WorkspaceStore = {
	isLoading: boolean;
	workspaces: Workspace[];
	activeWorkspace: Workspace | null;
	setWorkspaces: (workspaces: Workspace[]) => void;
	setActiveWorkspace: (worksapce: Workspace) => void;
	setLoading: (isLoading: boolean) => void;
};

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
	isLoading: false,
	workspaces: [],
	activeWorkspace: null,
	setWorkspaces: (organizations: Workspace[]) => {
		set({ workspaces: organizations });
	},
	setActiveWorkspace: (organization: Workspace) => {
		authClient.organization.setActive({
			organizationId: organization.id,
			organizationSlug: organization.slug,
		});
		set({ activeWorkspace: organization });
	},
	setLoading: (isLoading: boolean) => {
		set({ isLoading });
	},
}));
