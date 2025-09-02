import { Outlet, createFileRoute } from '@tanstack/react-router';

import { SettingsTabs } from '@/components/settings/settings-tabs';

export const Route = createFileRoute('/settings/workspace')({
	component: LayoutComponent,
});

const navigationItems = [
	{
		name: 'Webhooks',
		href: '/settings/workspace/webhooks',
		description: 'Manage webhook endpoints and configurations',
	},
	{
		name: 'API Keys',
		href: '/settings/workspace/api-keys',
		description: 'Manage API keys and permissions',
	},
	{
		name: 'Members',
		href: '/settings/workspace/members',
		description: 'Manage workspace members',
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
