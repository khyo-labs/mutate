import { useEffect, useRef } from 'react';

import type { Workspace } from '@/api/workspaces';
import { useListWorkspace } from '@/hooks/use-workspaces';
import { useWorkspaceStore } from '@/stores/workspace-store';

export function WorkspaceInitializer() {
	const { data: workspaces } = useListWorkspace();
	const { setWorkspaces, activeWorkspace, setActiveWorkspace } =
		useWorkspaceStore();
	const hasInitialized = useRef(false);

	useEffect(() => {
		if (workspaces && !hasInitialized.current) {
			setWorkspaces(workspaces as unknown as Workspace[]);
			if (!activeWorkspace && workspaces.length > 0) {
				setActiveWorkspace(workspaces[0] as unknown as Workspace);
			}
			hasInitialized.current = true;
		}
	}, [workspaces, setWorkspaces, activeWorkspace, setActiveWorkspace]);

	return null;
}
