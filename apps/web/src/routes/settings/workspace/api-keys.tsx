import { createFileRoute } from '@tanstack/react-router';

import { ApiKeySettings } from '@/components/settings/api-key-settings';

export const Route = createFileRoute('/settings/workspace/api-keys')({
	component: ApiKeySettings,
});
