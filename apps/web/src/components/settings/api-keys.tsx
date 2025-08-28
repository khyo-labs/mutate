import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Eye, EyeOff, Key, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { apiKeysApi, type ApiKey, type CreateApiKeyRequest } from '@/api/api-keys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CreateApiKeyForm {
	name: string;
	expiresAt: string;
}

export function ApiKeysSettings() {
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);
	const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
	const queryClient = useQueryClient();

	// Fetch API keys
	const { data: apiKeys, isLoading } = useQuery({
		queryKey: ['api-keys'],
		queryFn: apiKeysApi.list,
	});

	// Form for creating API keys
	const { control, handleSubmit, formState: { errors }, reset } = useForm<CreateApiKeyForm>({
		defaultValues: {
			name: '',
			expiresAt: '',
		},
	});

	// Create API key mutation
	const createMutation = useMutation({
		mutationFn: apiKeysApi.create,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['api-keys'] });
			setCreatedApiKey(data.apiKey || null);
			setShowCreateForm(false);
			reset();
		},
	});

	// Delete API key mutation
	const deleteMutation = useMutation({
		mutationFn: apiKeysApi.delete,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['api-keys'] });
		},
	});

	const onCreateSubmit = (data: CreateApiKeyForm) => {
		const createData: CreateApiKeyRequest = {
			name: data.name,
			permissions: ['transform'],
		};

		if (data.expiresAt) {
			createData.expiresAt = data.expiresAt;
		}

		createMutation.mutate(createData);
	};

	const handleCopy = (text: string) => {
		navigator.clipboard.writeText(text);
		toast.success('Copied to clipboard');
	};

	const toggleKeyVisibility = (keyId: string) => {
		const newVisible = new Set(visibleKeys);
		if (newVisible.has(keyId)) {
			newVisible.delete(keyId);
		} else {
			newVisible.add(keyId);
		}
		setVisibleKeys(newVisible);
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return 'Never';
		return new Date(dateString).toLocaleDateString();
	};

	const isExpired = (expiresAt: string | null) => {
		if (!expiresAt) return false;
		return new Date(expiresAt) < new Date();
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							<Key className="h-5 w-5" />
							API Keys
						</CardTitle>
						<CardDescription>
							Manage API keys for programmatic access to the transformation API
						</CardDescription>
					</div>
					<Button 
						onClick={() => setShowCreateForm(true)}
						className="flex items-center gap-2"
					>
						<Plus className="h-4 w-4" />
						New API Key
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{/* Show created API key */}
				{createdApiKey && (
					<div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="font-medium text-green-800">API Key Created</h3>
								<p className="text-sm text-green-600 mt-1">
									Save this key now - you won't be able to see it again!
								</p>
							</div>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setCreatedApiKey(null)}
								className="text-green-600"
							>
								×
							</Button>
						</div>
						<div className="flex items-center gap-2 mt-3 p-3 bg-white rounded border font-mono text-sm">
							<code className="flex-1">{createdApiKey}</code>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => handleCopy(createdApiKey)}
							>
								<Copy className="h-4 w-4" />
							</Button>
						</div>
					</div>
				)}

				{/* Create form */}
				{showCreateForm && (
					<div className="mb-6 p-4 border rounded-lg bg-muted/50">
						<h3 className="font-medium mb-4">Create New API Key</h3>
						<form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
							<div>
								<label className="block text-sm font-medium mb-1">
									Name *
								</label>
								<Controller
									name="name"
									control={control}
									rules={{ required: 'Name is required' }}
									render={({ field }) => (
										<input
											{...field}
											placeholder="e.g., Production API, Development"
											className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
										/>
									)}
								/>
								{errors.name && (
									<p className="text-sm text-destructive mt-1">
										{errors.name.message}
									</p>
								)}
							</div>

							<div>
								<label className="block text-sm font-medium mb-1">
									Expires At (Optional)
								</label>
								<Controller
									name="expiresAt"
									control={control}
									render={({ field }) => (
										<input
											{...field}
											type="date"
											className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
										/>
									)}
								/>
							</div>

							<div className="flex gap-2">
								<Button 
									type="submit"
									disabled={createMutation.isPending}
								>
									{createMutation.isPending ? 'Creating...' : 'Create API Key'}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={() => setShowCreateForm(false)}
								>
									Cancel
								</Button>
							</div>
						</form>
					</div>
				)}

				{/* API Keys list */}
				{isLoading ? (
					<div className="text-center py-8">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
						<p className="mt-2 text-muted-foreground">Loading API keys...</p>
					</div>
				) : apiKeys && apiKeys.length > 0 ? (
					<div className="space-y-4">
						{apiKeys.map((key) => (
							<div
								key={key.id}
								className={`p-4 border rounded-lg ${
									isExpired(key.expiresAt) ? 'border-destructive/50 bg-destructive/5' : ''
								}`}
							>
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<div className="flex items-center gap-2">
											<h3 className="font-medium">{key.name}</h3>
											{isExpired(key.expiresAt) && (
												<span className="px-2 py-1 text-xs bg-destructive/10 text-destructive rounded">
													Expired
												</span>
											)}
										</div>
										<div className="text-sm text-muted-foreground mt-1 space-y-1">
											<div>Created: {formatDate(key.createdAt)}</div>
											<div>Last used: {formatDate(key.lastUsedAt)}</div>
											{key.expiresAt && (
												<div>Expires: {formatDate(key.expiresAt)}</div>
											)}
											<div>Permissions: {key.permissions.join(', ')}</div>
										</div>
										
										{/* Masked key display */}
										<div className="flex items-center gap-2 mt-3">
											<code className="text-sm bg-muted p-2 rounded font-mono">
												{visibleKeys.has(key.id) 
													? `mt_${'*'.repeat(32)}`
													: `mt_${'*'.repeat(32)}`
												}
											</code>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => toggleKeyVisibility(key.id)}
											>
												{visibleKeys.has(key.id) ? (
													<EyeOff className="h-4 w-4" />
												) : (
													<Eye className="h-4 w-4" />
												)}
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleCopy(`mt_${'*'.repeat(32)}`)}
											>
												<Copy className="h-4 w-4" />
											</Button>
										</div>
									</div>

									<div className="flex gap-2">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => deleteMutation.mutate(key.id)}
											disabled={deleteMutation.isPending}
											className="text-destructive hover:text-destructive"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="text-center py-8">
						<Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
						<h3 className="font-medium mb-2">No API Keys</h3>
						<p className="text-muted-foreground mb-4">
							Create your first API key to start using the transformation API programmatically.
						</p>
						<Button onClick={() => setShowCreateForm(true)}>
							<Plus className="h-4 w-4 mr-2" />
							Create API Key
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}