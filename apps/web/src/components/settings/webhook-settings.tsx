import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@/api/client';
import { useWorkspaceStore } from '@/stores/workspace-store';
import type { SuccessResponse, Webhook } from '@/types';

import { Card, CardContent } from '../ui/card';
import { SettingsHeader } from './header';
import { WebhookDetails } from './webhook-details';
import { WebhookDrawer } from './webhook-drawer';

const queryKey = ['workspace', 'webhooks'];

export function WebhookSettings() {
	const queryClient = useQueryClient();
	const { activeWorkspace } = useWorkspaceStore();
	const { data: webhooks = [], isLoading } = useQuery<Webhook[]>({
		queryKey: [...queryKey, activeWorkspace?.id],
		queryFn: async () => {
			const response = await api.get<SuccessResponse<Webhook[]>>(
				'/v1/workspaces/webhooks?includeSecrets=true',
			);
			return response.data;
		},
	});

	const deleteWebhook = useMutation({
		mutationFn: async (id: string) => {
			const response = await api.delete<SuccessResponse<void>>(
				`/v1/workspaces/webhooks/${id}`,
			);
			if (!response.success) {
				toast.error('Failed to delete webhook');
				return;
			}
			toast.success('Webhook deleted successfully');
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: [...queryKey, activeWorkspace?.id],
			});
			toast.success('Webhook deleted successfully');
		},
	});

	return (
		<div className="space-y-6">
			<SettingsHeader
				title="Webhooks"
				description="Configure webhook URLs to receive real-time notifications when mutations complete. Protect your endpoints with a secret key for request validation."
				button={{
					label: 'New Webhook',
					icon: Plus,
					drawer: () => <WebhookDrawer />,
				}}
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
