import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import z from 'zod';

import { sendResetPassword } from '@/api/auth';
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

import { PublicLayout } from '../components/layouts';
import { authClient } from '../lib/auth-client';

export const Route = createFileRoute('/forgot-password')({
	beforeLoad: async () => {
		const { data: session } = await authClient.getSession();
		if (session) {
			throw redirect({
				to: '/',
			});
		}
	},
	component: ForgotPasswordComponent,
});

const forgotPasswordSchema = z.object({
	email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordComponent() {
	const [isLoading, setIsLoading] = useState(false);
	const [apiError, setApiError] = useState<string | null>(null);
	const [isSuccess, setIsSuccess] = useState(false);

	const form = useForm<ForgotPasswordFormData>({
		resolver: zodResolver(forgotPasswordSchema),
		defaultValues: {
			email: '',
		},
	});

	const onSubmit = async (data: ForgotPasswordFormData) => {
		try {
			setIsLoading(true);
			setApiError(null);
			await sendResetPassword(data.email);
			setIsSuccess(true);
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
					<div className="bg-card rounded-lg border p-6 text-center shadow-sm">
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
					<h2 className="mb-6 text-center text-2xl font-bold">
						Forgot Password
					</h2>

					<Form {...form}>
						<form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email address</FormLabel>
										<FormControl>
											<Input
												type="email"
												autoComplete="email"
												placeholder="Enter your email"
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
											Sending reset link...
										</>
									) : (
										'Send reset link'
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
