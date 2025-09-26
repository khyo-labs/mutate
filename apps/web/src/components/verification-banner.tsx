import { useState } from 'react';
import { toast } from 'sonner';

import { api } from '@/api/client';

import { Button } from './ui/button';

export function VerificationBanner() {
	const [isSending, setIsSending] = useState(false);

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
		<div className="bg-primary text-primary-foreground p-4">
			<div className="container mx-auto flex items-center justify-between">
				<p>
					Your email address has not been verified. Please check your inbox for
					a verification link.
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
	);
}
