import { createFileRoute } from '@tanstack/react-router';

import { ThemeSettings } from '@/components/settings/theme-settings';

export const Route = createFileRoute('/settings/account/appearance')({
	component: AppearanceComponent,
});

function AppearanceComponent() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<h1 className="text-2xl font-bold">Appearance</h1>
			</div>

			<div className="max-w-4xl space-y-6">
				<ThemeSettings />
			</div>
		</div>
	);
}
