import { Monitor, Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { useTheme } from '@/contexts/theme-context';

export function ThemeSettings() {
	const { theme, setTheme } = useTheme();

	return (
		<Card>
			<CardHeader>
				<CardTitle>Theme</CardTitle>
				<CardDescription>
					Choose how mutate looks and feels in your browser.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid grid-cols-3 gap-4">
					<Button
						variant={theme === 'light' ? 'default' : 'outline'}
						size="sm"
						onClick={() => setTheme('light')}
						className="flex h-auto flex-col items-center gap-2 p-4"
					>
						<Sun className="h-5 w-5" />
						<span className="text-sm">Light</span>
					</Button>

					<Button
						variant={theme === 'dark' ? 'default' : 'outline'}
						size="sm"
						onClick={() => setTheme('dark')}
						className="flex h-auto flex-col items-center gap-2 p-4"
					>
						<Moon className="h-5 w-5" />
						<span className="text-sm">Dark</span>
					</Button>

					<Button
						variant={theme === 'system' ? 'default' : 'outline'}
						size="sm"
						onClick={() => setTheme('system')}
						className="flex h-auto flex-col items-center gap-2 p-4"
					>
						<Monitor className="h-5 w-5" />
						<span className="text-sm">System</span>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
