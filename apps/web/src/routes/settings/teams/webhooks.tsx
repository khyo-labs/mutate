import { createFileRoute } from '@tanstack/react-router';

import { WebhookSettings } from '@/components/settings/webhook-settings';

export const Route = createFileRoute('/settings/teams/webhooks')({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<h1 className="text-2xl font-bold">Webhook Settings</h1>
			</div>

			<div className="max-w-4xl">
				<WebhookSettings />
			</div>
		</div>
	);
}
