import { createFileRoute } from '@tanstack/react-router';

import { Layout } from '@/components/layout';
import { ProtectedRoute } from '@/components/protected-route';
import { Settings } from '@/components/settings';

export const Route = createFileRoute('/settings')({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<ProtectedRoute>
			<Layout>
				<Settings />
			</Layout>
		</ProtectedRoute>
	);
}
