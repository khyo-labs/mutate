import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Globe, Key, Plus, Star, Trash2, Webhook } from 'lucide-react';
import { useState } from 'react';

import { api } from '@/api/client';

interface WebhookUrl {
	id: string;
	name: string;
	url: string;
	isDefault: boolean;
	hasSecret: boolean;
	createdAt: string;
	updatedAt: string;
}

interface WebhookFormData {
	name: string;
	url: string;
	secret: string;
	isDefault: boolean;
}

export function WebhookSettings() {
	const [isCreating, setIsCreating] = useState(false);
	const [editingWebhook, setEditingWebhook] = useState<WebhookUrl | null>(null);
	const [formData, setFormData] = useState<WebhookFormData>({
		name: '',
		url: '',
		secret: '',
		isDefault: false,
	});

	const queryClient = useQueryClient();

	// Get all webhooks
	const { data: webhooks = [], isLoading } = useQuery<WebhookUrl[]>({
		queryKey: ['organization', 'webhooks'],
		queryFn: async () => {
			const response = (await api.get('/v1/organizations/webhooks')) as {
				data: { data: WebhookUrl[] };
			};
			console.log('response', response);
			return response.data.data;
		},
	});

	// Create webhook mutation
	const createWebhook = useMutation({
		mutationFn: async (data: WebhookFormData) => {
			const response = (await api.post('/v1/organizations/webhooks', data)) as {
				data: any;
			};
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['organization', 'webhooks'] });
			setIsCreating(false);
			resetForm();
		},
	});

	// Update webhook mutation
	const updateWebhook = useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: string;
			data: Partial<WebhookFormData>;
		}) => {
			const response = (await api.patch(
				`/v1/organizations/webhooks/${id}`,
				data,
			)) as { data: any };
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['organization', 'webhooks'] });
			setEditingWebhook(null);
			resetForm();
		},
	});

	// Delete webhook mutation
	const deleteWebhook = useMutation({
		mutationFn: async (id: string) => {
			const response = (await api.delete(`/v1/organizations/webhooks/${id}`)) as {
				data: any;
			};
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['organization', 'webhooks'] });
		},
	});

	// Set default webhook mutation
	const setDefaultWebhook = useMutation({
		mutationFn: async (id: string) => {
			const response = (await api.post(
				`/v1/organizations/webhooks/${id}/set-default`,
			)) as { data: any };
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['organization', 'webhooks'] });
		},
	});

	const resetForm = () => {
		setFormData({ name: '', url: '', secret: '', isDefault: false });
	};

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		if (editingWebhook) {
			updateWebhook.mutate({ id: editingWebhook.id, data: formData });
		} else {
			createWebhook.mutate(formData);
		}
	}

	function startEditing(webhook: WebhookUrl) {
		setEditingWebhook(webhook);
		setFormData({
			name: webhook.name,
			url: webhook.url,
			secret: '',
			isDefault: webhook.isDefault,
		});
		setIsCreating(true);
	}

	function cancelEditing() {
		setIsCreating(false);
		setEditingWebhook(null);
		resetForm();
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Webhook className="h-5 w-5" />
					<h2 className="text-xl font-semibold">Webhook URLs</h2>
				</div>
				<button
					onClick={() => setIsCreating(true)}
					disabled={isCreating}
					className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
				>
					<Plus className="h-4 w-4" />
					Add Webhook
				</button>
			</div>

			{isCreating && (
				<div className="rounded-lg border border-gray-200 bg-white p-6">
					<h3 className="mb-4 text-lg font-medium">
						{editingWebhook ? 'Edit Webhook' : 'Create New Webhook'}
					</h3>

					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label className="mb-1 block text-sm font-medium text-gray-700">
								Name
							</label>
							<input
								type="text"
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								placeholder="e.g., Production Webhook"
								className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
								required
							/>
						</div>

						<div>
							<label className="mb-1 block text-sm font-medium text-gray-700">
								URL
							</label>
							<input
								type="url"
								value={formData.url}
								onChange={(e) =>
									setFormData({ ...formData, url: e.target.value })
								}
								placeholder="https://your-api.com/webhook"
								className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
								required
							/>
						</div>

						<div>
							<label className="mb-1 block text-sm font-medium text-gray-700">
								Secret (Optional)
							</label>
							<input
								type="password"
								value={formData.secret}
								onChange={(e) =>
									setFormData({ ...formData, secret: e.target.value })
								}
								placeholder={
									editingWebhook
										? 'Leave blank to keep existing secret'
										: 'Webhook signing secret'
								}
								className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>

						{!editingWebhook && (
							<div className="flex items-center">
								<input
									type="checkbox"
									id="isDefault"
									checked={formData.isDefault}
									onChange={(e) =>
										setFormData({ ...formData, isDefault: e.target.checked })
									}
									className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
								/>
								<label
									htmlFor="isDefault"
									className="ml-2 block text-sm text-gray-700"
								>
									Set as default webhook
								</label>
							</div>
						)}

						<div className="flex gap-2">
							<button
								type="submit"
								disabled={createWebhook.isPending || updateWebhook.isPending}
								className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
							>
								{editingWebhook ? 'Update' : 'Create'} Webhook
							</button>
							<button
								type="button"
								onClick={cancelEditing}
								className="rounded-lg bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
							>
								Cancel
							</button>
						</div>
					</form>
				</div>
			)}

			{isLoading ? (
				<div className="py-8 text-center">Loading webhooks...</div>
			) : webhooks.length === 0 ? (
				<div className="py-8 text-center text-gray-500">
					No webhook URLs configured. Add your first webhook to get started.
				</div>
			) : (
				<div className="space-y-3">
					{webhooks.map((webhook) => (
						<div
							key={webhook.id}
							className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
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
									{webhook.hasSecret && (
										<div className="flex items-center gap-1">
											<Key className="h-4 w-4" />
											<span>Secured</span>
										</div>
									)}
								</div>
							</div>

							<div className="flex items-center gap-2">
								{!webhook.isDefault && (
									<button
										onClick={() => setDefaultWebhook.mutate(webhook.id)}
										disabled={setDefaultWebhook.isPending}
										className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-yellow-600"
										title="Set as default"
									>
										<Star className="h-4 w-4" />
									</button>
								)}

								<button
									onClick={() => startEditing(webhook)}
									className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-blue-600"
									title="Edit webhook"
								>
									<Edit2 className="h-4 w-4" />
								</button>

								<button
									onClick={() => deleteWebhook.mutate(webhook.id)}
									disabled={deleteWebhook.isPending}
									className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-red-600"
									title="Delete webhook"
								>
									<Trash2 className="h-4 w-4" />
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			{webhooks.length > 0 && (
				<div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
					<h3 className="mb-2 font-medium text-blue-900">Webhook Priority</h3>
					<div className="space-y-1 text-sm text-blue-800">
						<p>Webhooks are sent in this order of priority:</p>
						<ol className="ml-4 list-inside list-decimal space-y-1">
							<li>Transform request callback URL (if provided)</li>
							<li>Configuration-selected webhook URL</li>
							<li>Organization default webhook URL (marked with star)</li>
						</ol>
					</div>
				</div>
			)}
		</div>
	);
}
