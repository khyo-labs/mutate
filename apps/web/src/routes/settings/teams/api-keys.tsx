import { createFileRoute } from '@tanstack/react-router';

import { ApiKeysSettings } from '@/components/settings/api-keys';

export const Route = createFileRoute('/settings/teams/api-keys')({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<h1 className="text-2xl font-bold">API Keys</h1>
			</div>

			<div className="max-w-4xl">
				<ApiKeysSettings />
			</div>
		</div>
	);
}
