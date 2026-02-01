import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Eye, EyeOff } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { api } from '@/api/client';
import { useWorkspaceStore } from '@/stores/workspace-store';
import type { ApiResponse, Webhook } from '@/types';

import { Button } from '../ui/button';
import { DrawerClose, DrawerFooter } from '../ui/drawer';
import { Form, FormControl, FormField, FormItem, FormLabel } from '../ui/form';
import { Input } from '../ui/input';

const schema = z.object({
	name: z.string().min(1, 'Name is required'),
	url: z.url('Invalid URL'),
	secret: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function WebhookDrawer({ webhook }: { webhook?: Webhook }) {
	const queryClient = useQueryClient();
	const { activeWorkspace } = useWorkspaceStore();
	const [showSecret, setShowSecret] = useState<boolean>(!webhook);
	const [copied, setCopied] = useState(false);
	const closeButtonRef = useRef<HTMLButtonElement>(null);

	const form = useForm<FormData>({
		resolver: zodResolver(schema),
	});

	useEffect(() => {
		if (webhook) {
			form.reset(webhook);
		}
	}, [form, webhook]);

	const createWebhook = useMutation({
		mutationFn: async (data: FormData) => {
			if (!activeWorkspace) {
				throw new Error('No active workspace selected');
			}
			const response = await api.post<ApiResponse<Webhook>>(
				`/v1/workspace/${activeWorkspace.id}/webhooks`,
				data,
			);
			if (response.success) {
				toast.success('Webhook created successfully');
				return response.data;
			}
			toast.error('Failed to create webhook');
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workspace', 'webhooks'] });
			form.reset();
			closeButtonRef.current?.click();
		},
	});

	const updateWebhook = useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<FormData> }) => {
			if (!activeWorkspace) {
				throw new Error('No active workspace selected');
			}
			const response = await api.patch<ApiResponse<Webhook>>(
				`/v1/workspace/${activeWorkspace.id}/webhooks/${id}`,
				data,
			);
			if (response.success) {
				toast.success('Webhook updated successfully');
				return response.data;
			}
			toast.error('Failed to update webhook');
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workspace', 'webhooks'] });
			form.reset();
			closeButtonRef.current?.click();
		},
	});

	function handleSubmit(data: FormData) {
		if (webhook) {
			updateWebhook.mutate({ id: webhook.id, data });
		} else {
			createWebhook.mutate(data);
		}
	}

	function toggleSecret() {
		setShowSecret((prev) => !prev);
	}

	function copyToClipboard() {
		const text = form.getValues('secret') || '';
		navigator.clipboard.writeText(text);
		setCopied(true);
		toast.success('Copied to clipboard');
		setTimeout(() => setCopied(false), 2000);
	}

	function generateSecret() {
		const secret = nanoid();
		form.setValue('secret', secret);
	}

	return (
		<>
			<div className="flex-1 overflow-y-auto p-4">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input {...field} autoComplete="off" />
									</FormControl>
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="url"
							render={({ field }) => (
								<FormItem>
									<FormLabel>URL</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="secret"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Secret</FormLabel>
									<FormControl>
										<div className="flex items-center gap-2">
											<Input
												type={showSecret ? 'text' : 'password'}
												className="font-mono"
												{...field}
											/>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												onClick={toggleSecret}
												title={showSecret ? 'Hide secret' : 'Show secret'}
											>
												{showSecret ? (
													<EyeOff className="text-muted-foreground h-3 w-3" />
												) : (
													<Eye className="text-muted-foreground h-3 w-3" />
												)}
											</Button>
											<Button
												type="button"
												onClick={copyToClipboard}
												size="icon"
												variant="ghost"
												title="Copy to clipboard"
												className="relative"
											>
												<Copy
													className={`text-muted-foreground h-3 w-3 transition-all duration-200 ${
														copied ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
													}`}
												/>
												<Check
													className={`absolute inset-0 m-auto h-3 w-3 text-green-500 transition-all duration-200 ${
														copied ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
													}`}
												/>
											</Button>
											<Button type="button" size="sm" onClick={generateSecret}>
												Generate
											</Button>
										</div>
									</FormControl>
								</FormItem>
							)}
						/>
					</form>
				</Form>
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
						disabled={createWebhook.isPending || updateWebhook.isPending}
					>
						Save
					</Button>
				</DrawerFooter>
			</div>
		</>
	);
}
