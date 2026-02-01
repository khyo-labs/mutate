import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
	useCheckSlugExists,
	useCheckWorkspaceName,
	useUpdateWorkspace,
} from '@/hooks/use-workspaces';
import { useWorkspaceStore } from '@/stores/workspace-store';

import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';

const formSchema = z.object({
	name: z.string().min(1, 'Workspace name is required'),
	slug: z
		.string()
		.min(1, 'Workspace slug is required')
		.regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
		.refine((value) => !value.startsWith('-') && !value.endsWith('-'), {
			message: 'Slug cannot start or end with a hyphen',
		}),
});

type FormData = z.infer<typeof formSchema>;

export function WorkspaceDetailsForm() {
	const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);
	const isLoading = useWorkspaceStore((state) => state.isLoading);
	const updateWorkspace = useUpdateWorkspace();
	const checkSlugExists = useCheckSlugExists();
	const checkWorkspaceName = useCheckWorkspaceName();

	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: activeWorkspace?.name ?? '',
			slug: activeWorkspace?.slug ?? '',
		},
	});

	const slugValue = form.watch('slug');
	const nameValue = form.watch('name');
	const trimmedNameValue = nameValue?.trim() ?? '';
	const trimmedSlugValue = slugValue?.trim() ?? '';

	useEffect(() => {
		form.reset({
			name: activeWorkspace?.name ?? '',
			slug: activeWorkspace?.slug ?? '',
		});
		checkSlugExists.reset();
		checkWorkspaceName.reset();
	}, [activeWorkspace]);

	useEffect(() => {
		if (!activeWorkspace) {
			return;
		}

		const trimmedName = trimmedNameValue;

		if (trimmedName.length === 0) {
			checkWorkspaceName.reset();
			return;
		}

		if (trimmedName.toLowerCase() === activeWorkspace.name.toLowerCase()) {
			checkWorkspaceName.reset();
			form.clearErrors('name');
			return;
		}

		const timeoutId = window.setTimeout(async () => {
			try {
				const available = await checkWorkspaceName.mutateAsync({
					name: trimmedName,
					workspaceId: activeWorkspace.id,
				});

				if (!available) {
					form.setError('name', {
						type: 'manual',
						message: 'This workspace name is already taken',
					});
				} else {
					form.clearErrors('name');
				}
			} catch (error) {
				console.error('Failed to check workspace name availability', error);
			}
		}, 400);

		return () => window.clearTimeout(timeoutId);
	}, [trimmedNameValue, activeWorkspace?.id, activeWorkspace?.name]);

	useEffect(() => {
		if (!activeWorkspace) {
			return;
		}

		const trimmedSlug = trimmedSlugValue;

		if (trimmedSlug.length === 0) {
			checkSlugExists.reset();
			return;
		}

		if (trimmedSlug === activeWorkspace.slug) {
			checkSlugExists.reset();
			form.clearErrors('slug');
			return;
		}

		const slugRegex = /^[a-z0-9-]+$/;

		if (!slugRegex.test(trimmedSlug) || trimmedSlug.startsWith('-') || trimmedSlug.endsWith('-')) {
			checkSlugExists.reset();
			return;
		}

		const timeoutId = window.setTimeout(async () => {
			try {
				const available = await checkSlugExists.mutateAsync(trimmedSlug);

				if (!available) {
					form.setError('slug', {
						type: 'manual',
						message: 'This workspace URL is already taken',
					});
				} else {
					form.clearErrors('slug');
				}
			} catch (error) {
				console.error('Failed to check workspace slug availability', error);
			}
		}, 400);

		return () => window.clearTimeout(timeoutId);
	}, [trimmedSlugValue, activeWorkspace?.id, activeWorkspace?.slug]);

	async function onSubmit(values: FormData) {
		if (!activeWorkspace) {
			return;
		}

		const payload: { name?: string; slug?: string } = {};
		const trimmedName = values.name.trim();
		const trimmedSlug = values.slug.trim();

		if (trimmedName !== activeWorkspace.name) {
			payload.name = trimmedName;
		}

		if (trimmedSlug !== activeWorkspace.slug) {
			payload.slug = trimmedSlug;
		}

		if (Object.keys(payload).length === 0) {
			return;
		}

		try {
			const updatedWorkspace = await updateWorkspace.mutateAsync({
				workspaceId: activeWorkspace.id,
				data: payload,
			});

			form.reset({
				name: updatedWorkspace.name,
				slug: updatedWorkspace.slug,
			});
		} catch (error) {
			console.error('Failed to update workspace', error);
		}
	}

	if (!activeWorkspace) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Workspace details</CardTitle>
					<CardDescription>Update your workspace name and URL.</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-sm">
						{isLoading
							? 'Loading workspace information...'
							: 'Select a workspace to manage its settings.'}
					</p>
				</CardContent>
			</Card>
		);
	}

	const isCheckingAvailability = checkSlugExists.isPending || checkWorkspaceName.isPending;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Workspace details</CardTitle>
				<CardDescription>
					Update how your workspace appears and the URL your team uses.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Workspace name</FormLabel>
									<FormControl>
										<Input placeholder="Workspace name" {...field} />
									</FormControl>
									{!form.formState.errors.name &&
										checkWorkspaceName.isSuccess &&
										checkWorkspaceName.data &&
										trimmedNameValue.length > 0 &&
										trimmedNameValue.toLowerCase() !== activeWorkspace.name.toLowerCase() && (
											<p className="mt-1 text-sm text-green-600">Workspace name is available</p>
										)}
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="slug"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Workspace URL</FormLabel>
									<FormControl>
										<div className="flex">
											<span className="border-input bg-muted text-muted-foreground inline-flex items-center rounded-l-md border border-r-0 px-3 text-sm">
												usemutate.com/
											</span>
											<Input {...field} placeholder="workspace-url" className="rounded-l-none" />
										</div>
									</FormControl>
									{!form.formState.errors.slug &&
										checkSlugExists.isSuccess &&
										checkSlugExists.data &&
										trimmedSlugValue.length > 0 &&
										trimmedSlugValue !== activeWorkspace.slug && (
											<p className="mt-1 text-sm text-green-600">Workspace URL is available</p>
										)}
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="flex items-center gap-3">
							<Button
								type="submit"
								disabled={
									!form.formState.isDirty || updateWorkspace.isPending || isCheckingAvailability
								}
							>
								{updateWorkspace.isPending ? 'Saving…' : 'Save changes'}
							</Button>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
