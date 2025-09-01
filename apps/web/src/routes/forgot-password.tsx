import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import z from 'zod';

import { Button } from '@/components/ui/button';

import { PublicLayout } from '../components/layouts';
import { auth } from '../lib/auth-client';

export const Route = createFileRoute('/forgot-password')({
	component: ForgotPasswordComponent,
});

const forgotPasswordSchema = z.object({
	email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordComponent() {
	const navigate = useNavigate();
	const [isLoading, setIsLoading] = useState(false);
	const [apiError, setApiError] = useState<string | null>(null);
	const [isSuccess, setIsSuccess] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<ForgotPasswordFormData>({
		resolver: zodResolver(forgotPasswordSchema),
	});

	const onSubmit = async (data: ForgotPasswordFormData) => {
		try {
			setIsLoading(true);
			setApiError(null);
			await auth.email.sendResetPassword({ email: data.email });
			setIsSuccess(true);
			// navigate({ to: '/check-email' });
		} catch (error) {
			setApiError(
				error instanceof Error ? error.message : 'Failed to send reset link',
			);
		} finally {
			setIsLoading(false);
		}
	};

	if (isSuccess) {
		return (
			<PublicLayout>
				<div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
					<div className="bg-card rounded-lg border p-6 shadow-sm text-center">
						<h2 className="text-2xl font-bold">Check your email</h2>
						<p className="mt-4 text-gray-600">
							We've sent a password reset link to your email address. Please
							check your inbox and follow the instructions.
						</p>
					</div>
				</div>
			</PublicLayout>
		);
	}

	return (
		<PublicLayout>
			<div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
				<div className="bg-card rounded-lg border p-6 shadow-sm">
					<h2 className="text-center text-2xl font-bold">Forgot Password</h2>
					<form className="mt-6 space-y-6" onSubmit={handleSubmit(onSubmit)}>
						<div>
							<label
								htmlFor="email"
								className="block text-sm font-medium text-gray-700"
							>
								Email address
							</label>
							<div className="mt-1">
								<input
									{...register('email')}
									type="email"
									autoComplete="email"
									className="input"
									placeholder="Enter your email"
								/>
								{errors.email && (
									<p className="mt-1 text-sm text-red-600">
										{errors.email.message}
									</p>
								)}
							</div>
						</div>

						{apiError && (
							<div className="rounded-md bg-red-50 p-4">
								<div className="text-sm text-red-700">{apiError}</div>
							</div>
						)}

						<div>
							<Button type="submit" disabled={isLoading} className="w-full">
								{isLoading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Sending reset link...
									</>
								) : (
									'Send reset link'
								)}
							</Button>
						</div>
					</form>
				</div>
			</div>
		</PublicLayout>
	);
}
