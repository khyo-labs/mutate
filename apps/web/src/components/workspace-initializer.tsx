import { useEffect, useRef } from 'react';

import type { Workspace } from '@/api/workspaces';
import { useListWorkspace } from '@/hooks/use-workspaces';
import { useSession } from '@/lib/auth-client';
import { useWorkspaceStore } from '@/stores/workspace-store';

export function WorkspaceInitializer() {
	const { data: workspaces } = useListWorkspace();
	const { setWorkspaces, activeWorkspace, setActiveWorkspace } =
		useWorkspaceStore();
	const { data: session } = useSession();
	const hasInitialized = useRef(false);

	useEffect(() => {
		if (workspaces && !hasInitialized.current) {
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
		workspaces,
		setWorkspaces,
		activeWorkspace,
		setActiveWorkspace,
		session,
	]);

	return null;
}
