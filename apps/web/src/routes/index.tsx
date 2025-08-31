import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import type { Workspace } from '@/api/workspaces';
import { Dashboard } from '@/components/dashboard';
import { Layout } from '@/components/layouts';
import { useListWorkspace } from '@/hooks/use-workspaces';
import { useWorkspaceStore } from '@/stores/workspace-store';

import { CreateWorkspace } from '../components/workspace/create-workspace';

export const Route = createFileRoute('/')({
	component: RouteComponent,
});

export function RouteComponent() {
	const { data: workspaces, isPending } = useListWorkspace();
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

	const hasWorkspaces = (workspaces || []).length > 0;

	if (isPending) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<div className="border-primary-600 mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
					<p className="mt-2 text-sm text-gray-500">Loading...</p>
				</div>
			</div>
		);
	}

	if (!hasWorkspaces && !isPending) {
		return <CreateWorkspace />;
	}

	return (
		<Layout>
			<Dashboard />
		</Layout>
	);
}
