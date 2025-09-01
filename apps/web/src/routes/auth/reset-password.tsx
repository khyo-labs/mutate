import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { resetPassword } from '@/api/auth';
import { Button } from '@/components/ui/button';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import { PublicLayout } from '../../components/layouts';

const resetPasswordSearchSchema = z.object({
	token: z.string().optional(),
});

export const Route = createFileRoute('/auth/reset-password')({
	validateSearch: (search) => resetPasswordSearchSchema.parse(search),
	component: ResetPasswordComponent,
});

const resetPasswordSchema = z
	.object({
		password: z.string().min(8, 'Password must be at least 8 characters'),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword'],
	});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordComponent() {
	const navigate = useNavigate();
	const { token } = Route.useSearch();
	const [isLoading, setIsLoading] = useState(false);
	const [apiError, setApiError] = useState<string | null>(null);
	const [isSuccess, setIsSuccess] = useState(false);

	const form = useForm<ResetPasswordFormData>({
		resolver: zodResolver(resetPasswordSchema),
		defaultValues: {
			password: '',
			confirmPassword: '',
		},
	});

	const onSubmit = async (data: ResetPasswordFormData) => {
		if (!token) {
			setApiError('No reset token found.');
			return;
		}

		try {
			setIsLoading(true);
			setApiError(null);
			await resetPassword(data.password, token);
			setIsSuccess(true);
			setTimeout(() => {
				navigate({ to: '/login' });
			}, 3000);
		} catch (error) {
			setApiError(
				error instanceof Error ? error.message : 'Failed to reset password',
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
						<h2 className="text-2xl font-bold text-green-600">
							Password Reset!
						</h2>
						<p className="mt-4 text-gray-600">
							Your password has been successfully reset. You will be redirected
							to the login page.
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
					<h2 className="text-center text-2xl font-bold mb-6">Reset Password</h2>
					
					<Form {...form}>
						<form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<FormItem>
										<FormLabel>New Password</FormLabel>
										<FormControl>
											<Input
												type="password"
												placeholder="Enter your new password"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="confirmPassword"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Confirm New Password</FormLabel>
										<FormControl>
											<Input
												type="password"
												placeholder="Confirm your new password"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

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
											Resetting password...
										</>
									) : (
										'Reset password'
									)}
								</Button>
							</div>
						</form>
					</Form>
				</div>
			</div>
		</PublicLayout>
	);
}