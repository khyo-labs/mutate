import { createFileRoute } from '@tanstack/react-router';

import { WebhookSettings } from '@/components/settings/webhook-settings';

export const Route = createFileRoute('/settings/teams/webhooks')({
	component: WebhookSettings,
});
