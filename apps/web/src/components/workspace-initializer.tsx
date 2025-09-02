import { useEffect, useRef } from 'react';

import type { Workspace } from '@/api/workspaces';
import { useListWorkspace } from '@/hooks/use-workspaces';
import { useSession } from '@/stores/auth-store';
import { useWorkspaceStore } from '@/stores/workspace-store';

export function WorkspaceInitializer() {
	const { data: session, isPending } = useSession();
	const { data: workspaces } = useListWorkspace();
	const { setWorkspaces, activeWorkspace, setActiveWorkspace } =
		useWorkspaceStore();
	const hasInitialized = useRef(false);

	useEffect(() => {
		if (!session?.user) return;
		if (!isPending && workspaces && !hasInitialized.current) {
			setWorkspaces(workspaces as unknown as Workspace[]);
			if (!activeWorkspace && workspaces.length > 0) {
				const activeId = session?.activeOrganizationId;
				const workspaceToSelect =
					workspaces.find((ws) => ws.id === activeId) || workspaces[0];
				setActiveWorkspace(workspaceToSelect as unknown as Workspace);
			}
			hasInitialized.current = true;
		}
	}, [
		session,
		isPending,
		workspaces,
		setWorkspaces,
		activeWorkspace,
		setActiveWorkspace,
	]);

	return null;
}
