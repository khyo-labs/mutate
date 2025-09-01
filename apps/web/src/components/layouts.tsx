import React, { useState } from 'react';
import { toast } from 'sonner';

import { api } from '@/api/client';
import { useSession } from '@/stores/auth-store';
import type { SuccessResponse } from '@/types';

import { ProtectedRoute } from './protected-route';
import { Sidebar } from './sidebar';
import { Button } from './ui/button';

type LayoutProps = {
	children: React.ReactNode;
};

export function Layout({ children }: LayoutProps) {
	const { data: session } = useSession();
	const [isSending, setIsSending] = useState(false);

	const showBanner = !session?.user?.emailVerified;

	async function handleResendVerificationEmail() {
		setIsSending(true);
		try {
			await api.post<SuccessResponse>('/v1/auth/resend-verification-email');
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

				<div className="flex flex-1 overflow-hidden pt-10 lg:pt-0">
					<Sidebar />
					<main className="flex-1 overflow-auto">
						<div className="container mx-auto px-6 py-8">{children}</div>
					</main>
				</div>
			</div>
		</ProtectedRoute>
	);
}

export function PublicLayout({ children }: LayoutProps) {
	return (
		<div className="bg-background flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8">
			<div className="sm:mx-auto sm:w-full sm:max-w-md">
				<div className="mb-8 flex items-center justify-center gap-3">
					<div className="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-md text-lg font-bold">
						M
					</div>
					<h2 className="text-foreground text-3xl font-bold">mutate</h2>
				</div>
			</div>
			{children}
		</div>
	);
}
