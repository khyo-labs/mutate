import { Outlet, createFileRoute } from '@tanstack/react-router';

import { ProtectedRoute } from '@/components/protected-route';
import { Sidebar } from '@/components/sidebar';

export const Route = createFileRoute('/settings')({
	component: LayoutComponent,
});

function LayoutComponent() {
	return (
		<ProtectedRoute>
			<div className="bg-background flex h-screen overflow-hidden">
				<Sidebar />
				<div className="mx-auto h-full flex-1 overflow-auto">
					<Outlet />
				</div>
			</div>
		</ProtectedRoute>
	);
}
