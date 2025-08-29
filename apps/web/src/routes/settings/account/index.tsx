import { createFileRoute } from '@tanstack/react-router';
import { Palette, User } from 'lucide-react';

import { SettingsNavigationView } from '@/components/settings/settings-navigation-view';
import { useRedirectOnLargeScreen } from '@/hooks/use-redirect-on-large-screen';

export const Route = createFileRoute('/settings/account/')({
	component: AccountIndexComponent,
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

function AccountIndexComponent() {
	useRedirectOnLargeScreen('/settings/account/profile');

	return (
		<SettingsNavigationView
			navigationItems={navigationItems}
			title="Account Settings"
			titleIcon={User}
		/>
	);
}
