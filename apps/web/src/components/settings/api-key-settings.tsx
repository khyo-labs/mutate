import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { apiKeysApi } from '@/api/api-keys';
import { Card, CardContent } from '@/components/ui/card';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ApiKeyDetails } from './api-key-details';
import { ApiKeyDrawer } from './api-key-drawer';
import { SettingsHeader } from './header';

export function ApiKeySettings() {
	const queryClient = useQueryClient();
	const [keyToShow, setKeyToShow] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	const { data: apiKeys = [], isLoading } = useQuery({
		queryKey: ['workspace', 'api-keys'],
		queryFn: apiKeysApi.list,
	});

	const deleteMutation = useMutation({
		mutationFn: apiKeysApi.delete,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['api-keys'] });
		},
	});

	function showKeyOnCreate(key: string) {
		setKeyToShow(key);
	}

	function copyToClipboard(key: string) {
		navigator.clipboard.writeText(key);
		setCopied(true);
		toast.success('Copied to clipboard');
	}

	if (keyToShow) {
		return (
			<div className="space-y-6">
				<div className="border-success bg-success/10 rounded-lg border p-4">
					<h3 className="text-success font-medium">API Key Created</h3>
					<Input
						value={keyToShow}
						readOnly
						onClick={() => copyToClipboard(keyToShow)}
					/>

					<p className="text-destructive mt-1 text-sm">
						Save this key now - you won't be able to see it again!
					</p>
				</div>
				<Button disabled={!copied} onClick={() => setKeyToShow(null)}>
					Done
				</Button>
				<div className="bg-muted/50 rounded-lg p-3">
					<p className="font-medium">How to use this API key:</p>
					<code className="mt-2 block text-xs">
						Authorization: Bearer {keyToShow.slice(0, 10)}...
					</code>
				</div>
			</div>
		);
	}

	return (
		<>
			<div className="space-y-6">
				<SettingsHeader
					title="API Keys"
					description="Configure API keys for programmatic access to the mutation API"
					button={{
						label: 'New API Key',
						icon: Plus,
						drawer: () => <ApiKeyDrawer onSuccess={showKeyOnCreate} />,
					}}
				/>

				{isLoading && (
					<div className="py-8 text-center">Loading API keys...</div>
				)}

				{!isLoading && apiKeys.length === 0 && (
					<div className="py-8 text-center text-gray-500">
						Create your first API key to get started.
					</div>
				)}

				{!isLoading && apiKeys.length > 0 && (
					<Card>
						<CardContent>
							<div className="divide-border divide-y">
								{apiKeys.map((apiKey) => (
									<div key={apiKey.id} className="pb-8 last:pb-0">
										<ApiKeyDetails
											apiKey={apiKey}
											deleteApiKey={deleteMutation}
										/>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</>
	);
}
