import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@/api/client';
import type { ApiResponse, Webhook } from '@/types';

import { Card, CardContent } from '../ui/card';
import { SettingsHeader } from './header';
import { WebhookDetails } from './webhook-details';
import { WebhookDialog } from './webhook-dialog';

const queryKey = ['workspace', 'webhooks'];

export function WebhookSettings() {
	const queryClient = useQueryClient();
	const { data: webhooks = [], isLoading } = useQuery<Webhook[]>({
		queryKey: queryKey,
		queryFn: async () => {
			const response = await api.get<ApiResponse<Webhook[]>>(
				'/v1/workspaces/webhooks?includeSecrets=true',
			);
			if (response.success) {
				return response.data;
			}
			toast.error('Failed to get webhooks');
			return [];
		},
	});

	const deleteWebhook = useMutation({
		mutationFn: async (id: string) => {
			const response = await api.delete<ApiResponse<void>>(
				`/v1/workspaces/webhooks/${id}`,
			);
			if (!response.success) {
				toast.error('Failed to delete webhook');
				return;
			}
			toast.success('Webhook deleted successfully');
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKey });
			toast.success('Webhook deleted successfully');
		},
	});

	return (
		<div className="space-y-6">
			<SettingsHeader
				title="Webhooks"
				description="Configure webhook URLs to receive real-time notifications when mutations complete. Protect your endpoints with a secret key for request validation."
				button={{ label: 'New Webhook', icon: Plus, dialog: WebhookDialog }}
			/>

			{isLoading && <div className="py-8 text-center">Loading webhooks...</div>}

			{!isLoading && webhooks.length === 0 && (
				<div className="py-8 text-center text-gray-500">
					No webhook URLs configured. Add your first webhook to get started.
				</div>
			)}

			{!isLoading && webhooks.length > 0 && (
				<Card>
					<CardContent>
						<div className="divide-border divide-y">
							{webhooks.map((webhook) => (
								<div key={webhook.id} className="pb-8 last:pb-0">
									<WebhookDetails
										webhook={webhook}
										deleteWebhook={deleteWebhook}
									/>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
