import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import type { ApiKey } from '@/api/api-keys';
import { apiKeysApi } from '@/api/api-keys';

import { Button } from '../ui/button';
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from '../ui/drawer';
import { Form, FormControl, FormField, FormItem, FormLabel } from '../ui/form';
import { Input } from '../ui/input';

const schema = z.object({
	name: z.string().min(1, 'Name is required'),
	permissions: z.array(z.string()),
	expiresAt: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	apiKey?: ApiKey;
	onSuccess?: () => void;
};

export function ApiKeyDrawer({ open, onOpenChange, apiKey, onSuccess }: Props) {
	const queryClient = useQueryClient();
	const [createdKey, setCreatedKey] = useState<string | null>(null);
	const [showKey, setShowKey] = useState(false);
	const [copied, setCopied] = useState(false);

	const form = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: apiKey?.name || '',
			permissions: apiKey?.permissions || ['transform'],
			expiresAt: '',
		},
	});

	useEffect(() => {
		if (apiKey) {
			form.reset({
				name: apiKey.name,
				permissions: apiKey.permissions,
				expiresAt: apiKey.expiresAt || '',
			});
		} else {
			form.reset({
				name: '',
				permissions: ['transform'],
				expiresAt: '',
			});
		}
		setCreatedKey(null);
	}, [form, apiKey, open]);

	const createMutation = useMutation({
		mutationFn: apiKeysApi.create,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['api-keys'] });
			if (data.apiKey) {
				setCreatedKey(data.apiKey);
				setShowKey(true);
			} else {
				toast.success('API key created successfully');
				onSuccess?.();
			}
		},
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: FormData }) =>
			apiKeysApi.update(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['api-keys'] });
			toast.success('API key updated successfully');
			onSuccess?.();
		},
	});

	function handleSubmit(data: FormData) {
		if (apiKey) {
			updateMutation.mutate({ id: apiKey.id, data });
		} else {
			createMutation.mutate(data);
		}
	}

	function copyToClipboard() {
		if (createdKey) {
			navigator.clipboard.writeText(createdKey);
			setCopied(true);
			toast.success('Copied to clipboard');
			setTimeout(() => setCopied(false), 2000);
		}
	}

	function handleClose() {
		form.reset();
		setCreatedKey(null);
		setShowKey(false);
		onOpenChange(false);
	}

	function formatDateForInput(dateString?: string | null): string {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toISOString().split('T')[0];
	}

	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="h-full w-full sm:max-w-md">
				<DrawerHeader>
					<DrawerTitle>
						{apiKey ? 'Edit API Key' : 'Create New API Key'}
					</DrawerTitle>
					<DrawerDescription>
						{apiKey
							? 'Update the details of your API key'
							: 'Create a new API key for programmatic access'}
					</DrawerDescription>
				</DrawerHeader>

				<div className="flex-1 overflow-y-auto p-4">
					{createdKey ? (
						<div className="space-y-4">
							<div className="rounded-lg border border-green-200 bg-green-50 p-4">
								<h3 className="font-medium text-green-800">API Key Created</h3>
								<p className="mt-1 text-sm text-green-600">
									Save this key now - you won't be able to see it again!
								</p>
							</div>

							<div className="space-y-2">
								<label className="text-sm font-medium">Your API Key</label>
								<div className="flex items-center gap-2">
									<div className="bg-muted flex-1 rounded-md border p-3 font-mono text-sm">
										{showKey ? createdKey : '••••••••••••••••••••••••••••••••'}
									</div>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onClick={() => setShowKey(!showKey)}
									>
										{showKey ? (
											<EyeOff className="h-4 w-4" />
										) : (
											<Eye className="h-4 w-4" />
										)}
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onClick={copyToClipboard}
										className="relative"
									>
										<Copy
											className={`h-4 w-4 transition-all duration-200 ${
												copied ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
											}`}
										/>
										<Check
											className={`absolute inset-0 m-auto h-4 w-4 text-green-500 transition-all duration-200 ${
												copied ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
											}`}
										/>
									</Button>
								</div>
							</div>

							<div className="bg-muted/50 rounded-lg p-3 text-sm">
								<p className="font-medium">How to use this API key:</p>
								<code className="mt-2 block text-xs">
									Authorization: Bearer {createdKey.slice(0, 10)}...
								</code>
							</div>
						</div>
					) : (
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
										<li>Transform files</li>
										<li>Check job status</li>
										<li>Download results</li>
									</ul>
								</div>
							</form>
						</Form>
					)}
				</div>

				<DrawerFooter>
					{createdKey ? (
						<Button onClick={handleClose}>Done</Button>
					) : (
						<>
							<Button
								type="submit"
								onClick={form.handleSubmit(handleSubmit)}
								disabled={createMutation.isPending || updateMutation.isPending}
							>
								{createMutation.isPending || updateMutation.isPending
									? 'Saving...'
									: apiKey
										? 'Update API Key'
										: 'Create API Key'}
							</Button>
							<DrawerClose asChild>
								<Button variant="outline" onClick={() => form.reset()}>
									Cancel
								</Button>
							</DrawerClose>
						</>
					)}
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
