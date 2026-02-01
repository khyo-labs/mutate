import { createFileRoute } from '@tanstack/react-router';
import { Monitor, Moon, Sun } from 'lucide-react';

import { SettingsHeader } from '@/components/settings/header';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/hooks/use-theme';

export const Route = createFileRoute('/settings/account/appearance')({
	component: AppearanceComponent,
});

function AppearanceComponent() {
	const { theme, setTheme } = useTheme();

	const themes = [
		{
			name: 'Light mode',
			value: 'light' as const,
			icon: Sun,
			description: 'Theme to use for light mode',
		},
		{
			name: 'Dark mode',
			value: 'dark' as const,
			icon: Moon,
			description: 'Theme to use for dark mode',
		},
		{
			name: 'System',
			value: 'system' as const,
			icon: Monitor,
			description: 'Theme to use to match your system theme',
		},
	];

	return (
		<div className="space-y-6">
			<SettingsHeader
				title="Theme preferences"
				description="Set your theme preference. Use automatic system sync for day/night switching or select a single theme."
			/>

			<div className="space-y-4">
				<h2 className="mb-3 text-base font-medium">Theme</h2>

				<Card>
					<CardContent className="p-4">
						<ul className="divide-border grid gap-3 divide-y">
							{themes.map((item) => {
								const isSelected = theme === item.value;

								return (
									<li
										key={item.value}
										className="flex items-center justify-between pb-3 last:pb-0"
										onClick={() => setTheme(item.value)}
									>
										<div className="flex items-center gap-3">
											<div>
												<div className="text-sm">{item.name}</div>
												<p className="text-muted-foreground text-xs">{item.description}</p>
											</div>
										</div>
										<div className="text-muted-foreground flex items-center gap-2 text-sm">
											{isSelected ? 'On' : 'Off'}
											<Switch
												checked={isSelected}
												onCheckedChange={() => setTheme(item.value)}
												onClick={(e) => e.stopPropagation()}
											/>
										</div>
									</li>
								);
							})}
						</ul>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
