import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';

import type { ApiKey, ApiKeyFormData } from '@/api/api-keys';
import { apiKeysApi, schema } from '@/api/api-keys';

import { Button } from '../ui/button';
import { DrawerClose, DrawerFooter } from '../ui/drawer';
import { Form, FormControl, FormField, FormItem, FormLabel } from '../ui/form';
import { Input } from '../ui/input';

export function ApiKeyDrawer({
	apiKey,
	onSuccess,
}: {
	apiKey?: ApiKey;
	onSuccess?: (id: string) => void;
}) {
	const queryClient = useQueryClient();
	const closeButtonRef = useRef<HTMLButtonElement>(null);

	const form = useForm<ApiKeyFormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: apiKey?.name || '',
			permissions: apiKey?.permissions || ['transform'],
			expiresAt: apiKey?.expiresAt || null,
		},
	});

	useEffect(() => {
		if (apiKey) {
			form.reset(apiKey);
		}
	}, [form, apiKey]);

	const createApiKey = useMutation({
		mutationFn: apiKeysApi.create,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['workspace', 'api-keys'] });
			if (data.apiKey) {
				onSuccess?.(data.apiKey);
			}
			closeButtonRef.current?.click();
		},
	});

	const updateApiKey = useMutation({
		mutationFn: ({ id, data }: { id: string; data: ApiKeyFormData }) =>
			apiKeysApi.update(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workspace', 'api-keys'] });
			closeButtonRef.current?.click();
		},
	});

	function handleSubmit(data: ApiKeyFormData) {
		if (apiKey) {
			updateApiKey.mutate({ id: apiKey.id, data });
		} else {
			createApiKey.mutate(data);
		}
	}

	function formatDateForInput(dateString?: string | null): string {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toISOString().split('T')[0];
	}

	return (
		<>
			<div className="flex-1 overflow-y-auto p-4">
				{
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(handleSubmit)}
							className="space-y-4"
						>
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Name</FormLabel>
										<FormControl>
											<Input
												{...field}
												placeholder="e.g., Production API"
												autoComplete="off"
											/>
										</FormControl>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="expiresAt"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Expires At (Optional)</FormLabel>
										<FormControl>
											<Input
												{...field}
												type="date"
												value={formatDateForInput(field.value)}
												onChange={(e) => field.onChange(e.target.value)}
												min={new Date().toISOString().split('T')[0]}
											/>
										</FormControl>
									</FormItem>
								)}
							/>

							<div className="bg-muted/50 rounded-lg p-3 text-sm">
								<p className="font-medium">Permissions</p>
								<p className="text-muted-foreground mt-1">
									This API key will have access to:
								</p>
								<ul className="text-muted-foreground mt-2 list-inside list-disc">
									<li>Mutate files</li>
									<li>Check status of mutations</li>
									<li>Download results of mutation</li>
								</ul>
							</div>
						</form>
					</Form>
				}
			</div>

			<div className="p-4">
				<DrawerFooter>
					<DrawerClose asChild>
						<Button
							ref={closeButtonRef}
							type="button"
							variant="outline"
							onClick={() => form.reset()}
						>
							Cancel
						</Button>
					</DrawerClose>
					<Button
						type="submit"
						onClick={form.handleSubmit(handleSubmit)}
						disabled={createApiKey.isPending || updateApiKey.isPending}
					>
						Save
					</Button>
				</DrawerFooter>
			</div>
		</>
	);
}
