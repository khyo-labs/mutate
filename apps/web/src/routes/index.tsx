import { Link, createFileRoute, redirect } from '@tanstack/react-router';
import { Plus } from 'lucide-react';

import { Dashboard } from '@/components/dashboard';
import { Layout } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { useListWorkspace } from '@/hooks/use-workspaces';
import { useSession } from '@/stores/auth-store';

export const Route = createFileRoute('/')({
	component: RouteComponent,
});

export function RouteComponent() {
	const { data: session, isPending: isSessionPending } = useSession();
	const { data: workspaces, isPending: isWorkspacesPending } =
		useListWorkspace();

	const hasWorkspaces = (workspaces || []).length > 0;

	if (isSessionPending) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<div className="border-primary-600 mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
					<p className="mt-2 text-sm text-gray-500">Loading...</p>
				</div>
			</div>
		);
	}

	if (!session?.user) {
		window.location.href = '/login';
		return null;
	}

	if (isWorkspacesPending) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<div className="border-primary-600 mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
					<p className="mt-2 text-sm text-gray-500">Loading workspaces...</p>
				</div>
			</div>
		);
	}

	if (!hasWorkspaces && !isWorkspacesPending) {
		return redirect({ to: '/join' });
	}

	return (
		<Layout
			title="Dashboard"
			buttons={[
				<Link to="/mutations/create">
					<Button>
						<Plus className="mr-2 h-4 w-4" />
						New Mutation
					</Button>
				</Link>,
			]}
		>
			<Dashboard />
		</Layout>
	);
}
