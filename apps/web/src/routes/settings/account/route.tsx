import { Outlet, createFileRoute } from '@tanstack/react-router';
import { Palette, Shield, User } from 'lucide-react';

import { SettingsTabs } from '@/components/settings/settings-tabs';

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
	{
		name: 'Security',
		href: '/settings/account/security',
		icon: Shield,
		description: 'Manage your account security settings',
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
