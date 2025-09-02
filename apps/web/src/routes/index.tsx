import { createFileRoute, redirect } from '@tanstack/react-router';

import { Dashboard } from '@/components/dashboard';
import { Layout } from '@/components/layouts';
import { useListWorkspace } from '@/hooks/use-workspaces';

export const Route = createFileRoute('/')({
	component: RouteComponent,
});

export function RouteComponent() {
	const { data: workspaces, isPending } = useListWorkspace();

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
		return redirect({ to: '/join' });
	}

	return (
		<Layout>
			<Dashboard />
		</Layout>
	);
}
