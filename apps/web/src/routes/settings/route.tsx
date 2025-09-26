import { Outlet, createFileRoute } from '@tanstack/react-router';

import { ProtectedRoute } from '@/components/protected-route';
import { Sidebar } from '@/components/sidebar';
import { VerificationBanner } from '@/components/verification-banner';
import { useSession } from '@/stores/auth-store';

export const Route = createFileRoute('/settings')({
	component: LayoutComponent,
});

function LayoutComponent() {
	const { data: session } = useSession();
	const showBanner = !session?.user?.emailVerified;

	return (
		<ProtectedRoute>
			<div className="bg-background flex h-screen flex-col">
				{showBanner && <VerificationBanner />}
				<div className="bg-background flex h-screen overflow-hidden">
					<Sidebar />
					<div className="mx-auto h-full flex-1 overflow-auto">
						<Outlet />
					</div>
				</div>
			</div>
		</ProtectedRoute>
	);
}
