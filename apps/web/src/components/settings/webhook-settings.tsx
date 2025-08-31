import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Eye, EyeOff, Globe, Key, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { api } from '@/api/client';
import type { ApiSuccessResponse, Webhook } from '@/types';

import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogTrigger } from '../ui/dialog';
import { SettingsHeader } from './header';
import { WebhookDialog } from './webhook-dialog';

export function WebhookSettings() {
	const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});

	const queryClient = useQueryClient();

	const { data: webhooks = [], isLoading } = useQuery<Webhook[]>({
		queryKey: ['organization', 'webhooks'],
		queryFn: async () => {
			const response = await api.get<ApiSuccessResponse<Webhook[]>>(
				'/v1/organizations/webhooks?includeSecrets=true',
			);
			return response.data;
		},
	});

	const deleteWebhook = useMutation({
		mutationFn: async (id: string) => {
			const response = (await api.delete(
				`/v1/organizations/webhooks/${id}`,
			)) as {
				data: any;
			};
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['organization', 'webhooks'] });
			toast.success('Webhook deleted successfully');
		},
	});

	const setDefaultWebhook = useMutation({
		mutationFn: async (id: string) => {
			const response = (await api.post(
				`/v1/organizations/webhooks/${id}/set-default`,
			)) as { data: any };
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['organization', 'webhooks'] });
			toast.success('Webhook set as default successfully');
		},
	});

	function toggleSecretVisibility(webhookId: string) {
		setShowSecret((prev) => ({
			...prev,
			[webhookId]: !prev[webhookId],
		}));
	}

	return (
		<div className="space-y-6">
			<SettingsHeader
				title="Webhooks"
				button={{ label: 'New Webhook', dialog: WebhookDialog }}
			/>

			{isLoading && <div className="py-8 text-center">Loading webhooks...</div>}

			{!isLoading && webhooks.length === 0 ? (
				<div className="py-8 text-center text-gray-500">
					No webhook URLs configured. Add your first webhook to get started.
				</div>
			) : (
				<div className="space-y-3">
					{webhooks.map((webhook) => (
						<div
							key={webhook.id}
							className="border-border bg-card flex items-center justify-between rounded-lg border p-4"
						>
							<div className="flex-1 space-y-1">
								<div className="flex items-center gap-2">
									<h3 className="font-medium">{webhook.name}</h3>
									{webhook.isDefault && (
										<span className="inline-flex items-center gap-1 rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
											<Star className="h-3 w-3" />
											Default
										</span>
									)}
								</div>

								<div className="flex items-center gap-4 text-sm text-gray-600">
									<div className="flex items-center gap-1">
										<Globe className="h-4 w-4" />
										<span className="max-w-xs truncate">{webhook.url}</span>
									</div>
									{webhook.secret && (
										<div className="flex items-center gap-2">
											<Key className="h-4 w-4" />
											<div className="flex items-center gap-1">
												<span className="max-w-xs truncate font-mono text-xs">
													{showSecret[webhook.id]
														? webhook.secret
														: '•'.repeat(12)}
												</span>
												<button
													onClick={() => toggleSecretVisibility(webhook.id)}
													className="text-gray-400 hover:text-gray-600"
													title={
														showSecret[webhook.id]
															? 'Hide secret'
															: 'Show secret'
													}
												>
													{showSecret[webhook.id] ? (
														<EyeOff className="h-3 w-3" />
													) : (
														<Eye className="h-3 w-3" />
													)}
												</button>
											</div>
										</div>
									)}
									{!webhook.secret && (
										<div className="flex items-center gap-1">
											<Key className="h-4 w-4" />
											<span>Secured</span>
										</div>
									)}
								</div>
							</div>

							<div className="flex items-center gap-2">
								{!webhook.isDefault && (
									<Button
										onClick={() => setDefaultWebhook.mutate(webhook.id)}
										disabled={setDefaultWebhook.isPending}
										title="Set as default"
									>
										<Star className="size-4" />
									</Button>
								)}

								<Dialog>
									<DialogTrigger asChild>
										<Button variant="ghost" size="icon" title="Edit webhook">
											<Edit2 className="text-primary size-4" />
										</Button>
									</DialogTrigger>
									<DialogContent>
										<WebhookDialog webhook={webhook} />
									</DialogContent>
								</Dialog>

								<Button
									variant="ghost"
									size="icon"
									onClick={() => deleteWebhook.mutate(webhook.id)}
									disabled={deleteWebhook.isPending}
									title="Delete webhook"
								>
									<Trash2 className="text-destructive size-4" />
								</Button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
