import { Link, Outlet, createFileRoute } from '@tanstack/react-router';
import { ChevronLeft, Key, Webhook } from 'lucide-react';

import { SettingsSidebar } from '@/components/settings/settings-sidebar';

export const Route = createFileRoute('/settings/teams')({
	component: LayoutComponent,
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

function LayoutComponent() {
	return (
		<div className="flex h-full overflow-hidden">
			<div className="flex flex-1 flex-col overflow-y-auto xl:overflow-hidden">
				<nav
					aria-label="Breadcrumb"
					className="border-b border-slate-200 bg-white xl:hidden"
				>
					<div className="mx-auto flex items-start px-4 py-3 sm:px-6 lg:px-8">
						<Link
							to="/settings/teams"
							className="-ml-1 inline-flex items-center space-x-3 text-sm font-medium text-slate-900"
						>
							<ChevronLeft className="size-5 text-slate-400" />
							<span>Team Settings</span>
						</Link>
					</div>
				</nav>

				<div className="flex flex-1">
					<SettingsSidebar navigationItems={navigationItems} />

					<main className="container flex-1 overflow-y-auto px-6 py-8 lg:px-8">
						<Outlet />
					</main>
				</div>
			</div>
		</div>
	);
}
