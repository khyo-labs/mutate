import { Outlet, createFileRoute } from '@tanstack/react-router';

import { SettingsLayout } from '@/components/layouts';

export const Route = createFileRoute('/settings')({
	component: LayoutComponent,
});

function LayoutComponent() {
	return (
		<SettingsLayout>
			<Outlet />
		</SettingsLayout>
	);
}
