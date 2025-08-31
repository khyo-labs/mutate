import { zodResolver } from '@hookform/resolvers/zod';
import { BuildingIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
	useCheckSlugExists,
	useCreateWorkspace,
} from '../../hooks/use-workspaces';
import { useAuthStore, useSession } from '../../stores/auth-store';
import { ProtectedRoute } from '../protected-route';
import { Button } from '../ui/button';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '../ui/form';
import { Input } from '../ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';

const formSchema = z.object({
	workspaceName: z.string().min(1, 'Workspace name is required'),
	workspaceSlug: z
		.string()
		.min(1, 'Workspace slug is required')
		.regex(
			/^[a-z0-9-]+$/,
			'Slug can only contain lowercase letters, numbers, and hyphens',
		)
		.refine(
			(slug) => !slug.startsWith('-') && !slug.endsWith('-'),
			'Slug cannot start or end with a hyphen',
		),
	companySize: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function CreateWorkspace() {
	const { logout } = useAuthStore();
	const { data: session } = useSession();
	const createWorkspace = useCreateWorkspace();
	const checkSlugExists = useCheckSlugExists();

	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			workspaceName: '',
			workspaceSlug: '',
			companySize: '',
		},
	});

	const workspaceName = form.watch('workspaceName');
	const workspaceSlug = form.watch('workspaceSlug');

	useEffect(() => {
		if (workspaceName) {
			const slug = workspaceName
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-|-$/g, '');
			form.setValue('workspaceSlug', slug);
		}
	}, [workspaceName, form]);

	useEffect(() => {
		const timeoutId = setTimeout(async () => {
			if (!workspaceSlug.length) {
				form.clearErrors('workspaceSlug');
				checkSlugExists.reset();
			}

			if (workspaceSlug?.length > 0) {
				try {
					const available = await checkSlugExists.mutateAsync(workspaceSlug);
					if (!available) {
						form.setError('workspaceSlug', {
							type: 'manual',
							message: 'This workspace URL is already taken',
						});
					} else {
						form.clearErrors('workspaceSlug');
					}
				} catch (error) {
					console.error('Error checking slug:', error);
				}
			}
		}, 500);

		return () => clearTimeout(timeoutId);
	}, [workspaceSlug]);

	async function onSubmit(data: FormData) {
		try {
			await createWorkspace.mutateAsync({
				name: data.workspaceName.trim(),
				slug: data.workspaceSlug.trim(),
				companySize: data.companySize,
			});
			window.location.reload();
		} catch (error) {
			console.error('Failed to create workspace:', error);
		}
	}

	const isSubmitting = form.formState.isSubmitting;

	return (
		<ProtectedRoute>
			<div className="min-h-screen bg-gray-50">
				{/* Header */}
				<div className="border-b border-gray-200 bg-white px-6 py-4">
					<div className="flex items-center justify-between">
						<Button onClick={logout}>Log out</Button>
						<div className="text-right">
							<div className="text-xs text-gray-500">Logged in as:</div>
							<div className="text-sm font-medium text-gray-900">
								{session?.user?.email}
							</div>
						</div>
					</div>
				</div>

				{/* Main Content */}
				<div className="flex flex-col items-center justify-center px-4 py-16">
					<div className="w-full max-w-lg">
						<div className="mb-8 text-center">
							<h1 className="mb-2 text-2xl font-semibold text-gray-900">
								Create a new workspace
							</h1>
							<p className="leading-relaxed text-gray-600">
								Workspaces are shared environments where teams can work
								collaboratively with shared data.
							</p>
						</div>

						<div className="rounded-lg border border-gray-200 bg-white p-6">
							<Form {...form}>
								<form
									onSubmit={form.handleSubmit(onSubmit)}
									className="space-y-6"
								>
									<FormField
										control={form.control}
										name="workspaceName"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Workspace Name</FormLabel>
												<FormControl>
													<Input
														placeholder="Enter workspace name"
														{...field}
													/>
												</FormControl>
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="workspaceSlug"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Workspace URL</FormLabel>
												<FormControl>
													<div className="flex">
														<span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
															usemutate.com/
														</span>
														<Input
															placeholder="workspace-url"
															className="rounded-l-none"
															{...field}
														/>
													</div>
												</FormControl>
												{!form.formState.errors.workspaceSlug &&
													checkSlugExists.isSuccess &&
													!checkSlugExists.isPending && (
														<p className="mt-1 text-sm text-green-600">
															Workspace URL is available
														</p>
													)}
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="companySize"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Company Size</FormLabel>
												<FormControl>
													<Select
														{...field}
														value={field.value || ''}
														onValueChange={field.onChange}
													>
														<SelectTrigger className="w-full">
															<SelectValue placeholder="Select company size" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="1-10">
																1-10 employees
															</SelectItem>
															<SelectItem value="11-50">
																11-50 employees
															</SelectItem>
															<SelectItem value="51-200">
																51-200 employees
															</SelectItem>
															<SelectItem value="201-500">
																201-500 employees
															</SelectItem>
															<SelectItem value="500+">
																500+ employees
															</SelectItem>
														</SelectContent>
													</Select>
												</FormControl>
											</FormItem>
										)}
									/>

									<Button
										type="submit"
										className="w-full"
										disabled={
											isSubmitting ||
											createWorkspace.isPending ||
											checkSlugExists.isPending
										}
									>
										<BuildingIcon className="mr-2 size-4" />
										{createWorkspace.isPending
											? 'Creating workspace...'
											: 'Create workspace'}
									</Button>
								</form>
							</Form>
						</div>
					</div>
				</div>
			</div>
		</ProtectedRoute>
	);
}
