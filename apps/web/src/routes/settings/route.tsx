import { Outlet, createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';

import { api } from '@/api/client';
import { ProtectedRoute } from '@/components/protected-route';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { useSession } from '@/stores/auth-store';

export const Route = createFileRoute('/settings')({
	component: LayoutComponent,
});

function LayoutComponent() {
	const { data: session } = useSession();
	const [isSending, setIsSending] = useState(false);

	const showBanner = !session?.user?.emailVerified;

	async function handleResendVerificationEmail() {
		setIsSending(true);
		try {
			await api.post<void>('/v1/auth/resend-verification-email');
			toast.success('Verification email sent. Please check your inbox.');
		} finally {
			setIsSending(false);
		}
	}

	return (
		<ProtectedRoute>
			<div className="bg-background flex h-screen flex-col">
				{showBanner && (
					<div className="bg-primary text-primary-foreground p-4">
						<div className="container mx-auto flex items-center justify-between">
							<p>
								Your email address has not been verified. Please check your
								inbox for a verification link.
							</p>
							<Button
								variant="secondary"
								onClick={handleResendVerificationEmail}
								disabled={isSending}
							>
								{isSending ? 'Sending...' : 'Resend verification email'}
							</Button>
						</div>
					</div>
				)}
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
