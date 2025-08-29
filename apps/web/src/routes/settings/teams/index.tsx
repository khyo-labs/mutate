import { createFileRoute } from '@tanstack/react-router';
import { Building2, Key, Webhook } from 'lucide-react';

import { SettingsNavigationView } from '@/components/settings/settings-navigation-view';
import { useRedirectOnLargeScreen } from '@/hooks/use-redirect-on-large-screen';

export const Route = createFileRoute('/settings/teams/')({
	component: TeamsIndexComponent,
});

const navigationItems = [
	{
		name: 'Webhooks',
		href: '/settings/teams/webhooks',
		icon: Webhook,
		description: 'Manage webhook endpoints and configurations',
	},
	{
		name: 'API Keys',
		href: '/settings/teams/api-keys',
		icon: Key,
		description: 'Manage API keys and permissions',
	},
];

function TeamsIndexComponent() {
	useRedirectOnLargeScreen('/settings/teams/webhooks');

	return (
		<SettingsNavigationView
			navigationItems={navigationItems}
			title="Team Settings"
			titleIcon={Building2}
		/>
	);
}