import { zodResolver } from '@hookform/resolvers/zod';
import {
	Link,
	createFileRoute,
	redirect,
	useNavigate,
} from '@tanstack/react-router';
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import z from 'zod';

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
import { authClient, signIn } from '../lib/auth-client';
import { useAuthStore } from '../stores/auth-store';

export const Route = createFileRoute('/login')({
	beforeLoad: async () => {
		const { data: session } = await authClient.getSession();
		if (session) {
			throw redirect({
				to: '/',
			});
		}
	},
	component: LoginComponent,
});

const loginSchema = z.object({
	email: z.string().email('Invalid email address'),
	password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginComponent() {
	const navigate = useNavigate();
	const { login, isLoading } = useAuthStore();
	const [showPassword, setShowPassword] = useState(false);
	const [apiError, setApiError] = useState<string | null>(null);

	const form = useForm<LoginFormData>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: '',
			password: '',
		},
	});

	useEffect(() => {
		if (
			'PublicKeyCredential' in window &&
			typeof PublicKeyCredential.isConditionalMediationAvailable === 'function'
		) {
			PublicKeyCredential.isConditionalMediationAvailable().then(
				async (isAvailable) => {
					if (isAvailable) {
						try {
							const { error } = await authClient.signIn.passkey({
								autoFill: true,
							});
							if (!error) {
								navigate({ to: '/' });
							}
						} catch (error) {
							// Silent fail for autofill - user can still use manual passkey button
							console.debug('Autofill passkey not used');
						}
					}
				},
			);
		}
	}, [navigate]);

	async function onSubmit(data: LoginFormData) {
		try {
			setApiError(null);
			await login(data);
			navigate({ to: '/' });
		} catch (error) {
			setApiError(error instanceof Error ? error.message : 'Login failed');
		}
	}

	async function handlePasskeyLogin() {
		try {
			setApiError(null);
			const { error } = await authClient.signIn.passkey();
			if (error) {
				throw new Error(error.message);
			}
			navigate({ to: '/' });
		} catch (error) {
			setApiError(
				error instanceof Error ? error.message : 'Passkey sign-in failed',
			);
		}
	}

	async function handleOAuthLogin(provider: 'github' | 'google') {
		try {
			await signIn.social({
				provider,
				callbackURL: `${import.meta.env.VITE_APP_BASE_URL || 'http://localhost:5173'}`,
			});
		} catch (error) {
			setApiError(
				error instanceof Error ? error.message : 'OAuth login failed',
			);
		}
	}

	return (
		<PublicLayout>
			<div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
				<div className="bg-card rounded-lg border p-6 shadow-sm">
					{/* OAuth Login Buttons */}
					<div className="mb-6 space-y-3">
						<button
							type="button"
							onClick={() => handleOAuthLogin('github')}
							className="flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
						>
							<svg
								className="mr-2 h-5 w-5"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fillRule="evenodd"
									d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
									clipRule="evenodd"
								/>
							</svg>
							Continue with GitHub
						</button>
						<button
							type="button"
							onClick={() => handleOAuthLogin('google')}
							className="flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
						>
							<svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
								<path
									fill="#4285F4"
									d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
								/>
								<path
									fill="#34A853"
									d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
								/>
								<path
									fill="#FBBC05"
									d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
								/>
								<path
									fill="#EA4335"
									d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
								/>
							</svg>
							Continue with Google
						</button>
						<button
							type="button"
							onClick={handlePasskeyLogin}
							className="flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
						>
							<KeyRound className="mr-2 h-5 w-5" />
							Continue with Passkey
						</button>
					</div>

					<div className="relative mb-6">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-gray-300" />
						</div>
						<div className="relative flex justify-center text-sm">
							<span className="bg-white px-2 text-gray-500">
								Or continue with email
							</span>
						</div>
					</div>

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
												autoComplete="email webauthn"
												placeholder="Enter your email"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Password</FormLabel>
										<FormControl>
											<div className="relative">
												<Input
													type={showPassword ? 'text' : 'password'}
													autoComplete="current-password"
													placeholder="Enter your password"
													className="pr-10"
													{...field}
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
											</div>
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
											Signing in...
										</>
									) : (
										'Sign in'
									)}
								</Button>
							</div>

							<div className="text-center">
								<span className="text-foreground/80 text-sm">
									Don't have an account?{' '}
									<Link
										to="/register"
										className="text-foreground hover:text-primary-500 font-medium"
									>
										Sign up
									</Link>
								</span>
							</div>
						</form>
					</Form>
				</div>
			</div>
		</PublicLayout>
	);
}
