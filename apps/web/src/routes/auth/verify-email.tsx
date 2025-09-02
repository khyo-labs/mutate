import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import { verifyEmail } from '@/api/auth';

import { PublicLayout } from '../../components/layouts';
import { authClient } from '../../lib/auth-client';

const verifyEmailSearchSchema = z.object({
	token: z.string().optional(),
});

export const Route = createFileRoute('/auth/verify-email')({
	beforeLoad: async () => {
		const { data: session } = await authClient.getSession();
		if (session) {
			throw redirect({
				to: '/',
			});
		}
	},
	validateSearch: (search) => verifyEmailSearchSchema.parse(search),
	component: VerifyEmailComponent,
});

export function VerifyEmailComponent() {
	const navigate = useNavigate();
	const { token } = Route.useSearch();
	const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
		'loading',
	);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const verify = async () => {
			if (!token) {
				setStatus('error');
				setError('No verification token found.');
				return;
			}

			try {
				await verifyEmail(token);
				setStatus('success');
				setTimeout(() => {
					navigate({ to: '/' });
				}, 3000);
			} catch (err) {
				setStatus('error');
				setError(err instanceof Error ? err.message : 'Verification failed.');
			}
		};

		verify();
	}, [token, navigate]);

	return (
		<PublicLayout>
			<div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
				<div className="bg-card rounded-lg border p-6 text-center shadow-sm">
					{status === 'loading' && (
						<>
							<Loader2 className="text-primary-600 mx-auto h-12 w-12 animate-spin" />
							<h2 className="mt-4 text-2xl font-bold">Verifying...</h2>
							<p className="mt-2 text-gray-600">
								Please wait while we verify your email address.
							</p>
						</>
					)}
					{status === 'success' && (
						<>
							<h2 className="text-2xl font-bold text-green-600">
								Email Verified!
							</h2>
							<p className="mt-4 text-gray-600">
								Your email has been successfully verified. You will be
								redirected shortly.
							</p>
						</>
					)}
					{status === 'error' && (
						<>
							<h2 className="text-2xl font-bold text-red-600">
								Verification Failed
							</h2>
							<p className="mt-4 text-gray-600">{error}</p>
						</>
					)}
				</div>
			</div>
		</PublicLayout>
	);
}
