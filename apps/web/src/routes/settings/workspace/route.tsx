import { Outlet, createFileRoute } from '@tanstack/react-router';

import { SettingsTabs } from '@/components/settings/settings-tabs';

export const Route = createFileRoute('/settings/workspace')({
	component: LayoutComponent,
});

const navigationItems = [
	{
		name: 'General',
		href: '/settings/workspace',
		description: 'Manage workspace settings',
	},
	{
		name: 'Members',
		href: '/settings/workspace/members',
		description: 'Manage workspace members',
	},
	{
		name: 'Billing',
		href: '/settings/workspace/billing',
		description: 'Subscription and usage',
	},
	{
		name: 'API Keys',
		href: '/settings/workspace/api-keys',
		description: 'Manage API keys and permissions',
	},
	{
		name: 'Webhooks',
		href: '/settings/workspace/webhooks',
		description: 'Manage webhook endpoints',
	},
	{
		name: 'Integrations',
		href: '/settings/workspace/integrations',
		description: 'Connect external services',
	},
	{
		name: 'Export',
		href: '/settings/workspace/export',
		description: 'Export and backup data',
	},
];

function LayoutComponent() {
	return (
		<div className="flex h-full flex-col overflow-hidden">
			<SettingsTabs navigationItems={navigationItems} />

			<main className="flex-1 overflow-y-auto">
				<div className="max-w-4xl p-8">
					<Outlet />
				</div>
			</main>
		</div>
	);
}
