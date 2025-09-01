import { createFileRoute } from '@tanstack/react-router';

import { ApiKeySettings } from '@/components/settings/api-key-settings';

export const Route = createFileRoute('/settings/workspace/api-keys')({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<h1 className="text-2xl font-bold">API Keys</h1>
			</div>

			<div className="max-w-4xl">
				<ApiKeySettings />
			</div>
		</div>
	);
}
