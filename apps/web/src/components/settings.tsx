import { Settings as SettingsIcon } from 'lucide-react';

import { ThemeSettings } from './settings/theme-settings';

export function Settings() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<SettingsIcon className="h-6 w-6" />
				<h1 className="text-2xl font-bold">Settings</h1>
			</div>

			<div className="max-w-2xl">
				<ThemeSettings />
			</div>
		</div>
	);
}