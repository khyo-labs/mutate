import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { authApi } from '../api/auth';
import { PublicLayout } from '../components/layout';
import { useAuthStore } from '../stores/auth-store';

const registerSchema = z.object({
	email: z.string().email('Invalid email address'),
	password: z.string().min(8, 'Password must be at least 8 characters'),
	organizationName: z
		.string()
		.min(2, 'Organization name must be at least 2 characters'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterPage() {
	const navigate = useNavigate();
	const { login, setLoading, isLoading } = useAuthStore();
	const [showPassword, setShowPassword] = useState(false);
	const [apiError, setApiError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<RegisterFormData>({
		resolver: zodResolver(registerSchema),
	});

	const onSubmit = async (data: RegisterFormData) => {
		try {
			setLoading(true);
			setApiError(null);

			const response = await authApi.register({
				...data,
				role: 'admin', // First user becomes admin
			});

			login(response.user, {
				accessToken: response.accessToken,
				refreshToken: response.refreshToken,
			});

			navigate({ to: '/' });
		} catch (error) {
			setApiError(
				error instanceof Error ? error.message : 'Registration failed',
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<PublicLayout>
			<div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
				<div className="card">
					<form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
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

						<div>
							<label
								htmlFor="organizationName"
								className="block text-sm font-medium text-gray-700"
							>
								Organization name
							</label>
							<div className="mt-1">
								<input
									{...register('organizationName')}
									type="text"
									autoComplete="organization"
									className="input"
									placeholder="Enter your organization name"
								/>
								{errors.organizationName && (
									<p className="mt-1 text-sm text-red-600">
										{errors.organizationName.message}
									</p>
								)}
							</div>
						</div>

						<div>
							<label
								htmlFor="password"
								className="block text-sm font-medium text-gray-700"
							>
								Password
							</label>
							<div className="relative mt-1">
								<input
									{...register('password')}
									type={showPassword ? 'text' : 'password'}
									autoComplete="new-password"
									className="input pr-10"
									placeholder="Enter your password"
								/>
								<button
									type="button"
									className="absolute inset-y-0 right-0 flex items-center pr-3"
									onClick={() => setShowPassword(!showPassword)}
								>
									{showPassword ? (
										<EyeOff className="h-4 w-4 text-gray-400" />
									) : (
										<Eye className="h-4 w-4 text-gray-400" />
									)}
								</button>
								{errors.password && (
									<p className="mt-1 text-sm text-red-600">
										{errors.password.message}
									</p>
								)}
							</div>
							<p className="mt-1 text-sm text-gray-500">
								Must be at least 8 characters long
							</p>
						</div>

						{apiError && (
							<div className="rounded-md bg-red-50 p-4">
								<div className="text-sm text-red-700">{apiError}</div>
							</div>
						)}

						<div>
							<button
								type="submit"
								disabled={isLoading}
								className="btn btn-primary w-full"
							>
								{isLoading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Creating account...
									</>
								) : (
									'Create account'
								)}
							</button>
						</div>

						<div className="text-center">
							<span className="text-sm text-gray-600">
								Already have an account?{' '}
								<Link
									to="/login"
									className="text-primary-600 hover:text-primary-500 font-medium"
								>
									Sign in
								</Link>
							</span>
						</div>
					</form>
				</div>
			</div>
		</PublicLayout>
	);
}
