import { Link, Outlet, createFileRoute } from '@tanstack/react-router';
import { ChevronLeft, User, Palette } from 'lucide-react';

import { SettingsSidebar } from '@/components/settings/settings-sidebar';

export const Route = createFileRoute('/settings/account')({
	component: LayoutComponent,
});

const navigationItems = [
	{
		name: 'Profile',
		href: '/settings/account/profile',
		icon: User,
		description: 'Manage your profile settings',
	},
	{
		name: 'Appearance',
		href: '/settings/account/appearance',
		icon: Palette,
		description: 'Customize your theme and display preferences',
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
							to="/settings/account"
							className="-ml-1 inline-flex items-center space-x-3 text-sm font-medium text-slate-900"
						>
							<ChevronLeft className="size-5 text-slate-400" />
							<span>Account Settings</span>
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
