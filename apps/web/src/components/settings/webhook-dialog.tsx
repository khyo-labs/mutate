import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCw } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { api } from '@/api/client';
import type { ApiSuccessResponse, Webhook } from '@/types';

import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '../ui/form';
import { Input } from '../ui/input';

const schema = z.object({
	name: z.string().min(1, 'Name is required'),
	url: z.url('Invalid URL'),
	secret: z.string().optional(),
	isDefault: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export function WebhookDialog({ webhook }: { webhook?: Webhook }) {
	const queryClient = useQueryClient();
	console.log({ webhook });

	useEffect(() => {
		if (webhook) {
			form.reset(webhook);
		}
	}, [webhook]);

	const form = useForm<FormData>({
		resolver: zodResolver(schema),
	});

	const createWebhook = useMutation({
		mutationFn: async (data: FormData) => {
			const response = await api.post<ApiSuccessResponse<Webhook>>(
				'/v1/organizations/webhooks',
				data,
			);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['organization', 'webhooks'] });
			form.reset();
			toast.success('Webhook created successfully');
		},
	});

	const updateWebhook = useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: string;
			data: Partial<FormData>;
		}) => {
			const response = (await api.patch(
				`/v1/organizations/webhooks/${id}`,
				data,
			)) as { data: any };
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['organization', 'webhooks'] });
			form.reset();
			toast.success('Webhook updated successfully');
		},
	});

	function handleSubmit(data: FormData) {
		if (webhook) {
			updateWebhook.mutate({ id: webhook.id, data });
		} else {
			createWebhook.mutate(data);
		}
	}

	function generateRandomSecret() {
		const secret = nanoid();
		form.setValue('secret', secret);
	}

	return (
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
									<Input type="text" {...field} />
									<Button
										type="button"
										size="sm"
										onClick={generateRandomSecret}
									>
										<RotateCw className="size-4" />
										Generate
									</Button>
								</div>
							</FormControl>
						</FormItem>
					)}
				/>
			</form>
		</Form>
	);
}
