import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Plus } from 'lucide-react';
import { useState } from 'react';

import { apiKeysApi } from '@/api/api-keys';
import { Card, CardContent } from '@/components/ui/card';
import { useSession } from '@/stores/auth-store';
import { useWorkspaceStore } from '@/stores/workspace-store';

import { Alert, AlertDescription } from '../ui/alert';
import { ApiKeyDetails } from './api-key-details';
import { ApiKeyDrawer } from './api-key-drawer';
import { SettingsHeader } from './header';
import { NewApiKey } from './new-api-key';

const queryKeys = ['workspace', 'api-keys'];

export function ApiKeySettings() {
	const queryClient = useQueryClient();
	const { activeWorkspace } = useWorkspaceStore();
	const { data: session } = useSession();
	const [keyToShow, setKeyToShow] = useState<string | null>(null);

	const isEmailVerified = session?.user?.emailVerified;

	const { data: apiKeys = [], isLoading } = useQuery({
		queryKey: [...queryKeys, activeWorkspace?.id],
		queryFn: apiKeysApi.list,
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => apiKeysApi.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: [...queryKeys, activeWorkspace?.id],
			});
		},
	});

	function showKeyOnCreate(key: string) {
		setKeyToShow(key);
	}

	if (keyToShow) {
		return <NewApiKey apiKey={keyToShow} onDone={() => setKeyToShow(null)} />;
	}

	return (
		<div className="space-y-6">
			<SettingsHeader
				title="API Keys"
				description="Configure API keys for programmatic access to the mutation API"
				button={{
					label: 'New API Key',
					icon: Plus,
					drawer: () => <ApiKeyDrawer onSuccess={showKeyOnCreate} />,
					disabled: !isEmailVerified,
				}}
			/>

			{!isEmailVerified && (
				<Alert>
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						You must verify your email address before you can create API keys. Check your inbox for
						the verification email.
					</AlertDescription>
				</Alert>
			)}

			{isLoading && <div className="py-8 text-center">Loading API keys...</div>}

			{!isLoading && apiKeys.length === 0 && (
				<Alert>
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>Create your first API key to get started.</AlertDescription>
				</Alert>
			)}

			{!isLoading && apiKeys.length > 0 && (
				<Card>
					<CardContent>
						<div className="divide-border divide-y">
							{apiKeys.map((apiKey) => (
								<div key={apiKey.id} className="pb-8 last:pb-0">
									<ApiKeyDetails apiKey={apiKey} deleteApiKey={deleteMutation} />
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
