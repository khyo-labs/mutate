import { Link, useLocation } from '@tanstack/react-router';

import { cn } from '@/lib/utils';

type NavigationItem = {
	name: string;
	href: string;
	description: string;
};

type Props = {
	navigationItems: NavigationItem[];
};

export function SettingsTabs({ navigationItems }: Props) {
	const location = useLocation();

	return (
		<div className="border-border bg-background mt-16 border-b border-t py-1.5 lg:mt-0 lg:border-t-0">
			<nav className="max-w-4xl px-8">
				<div className="flex space-x-8">
					{navigationItems.map((item) => {
						const isCurrent = location.pathname === item.href;

						return (
							<Link
								key={item.name}
								to={item.href}
								aria-current={isCurrent ? 'page' : undefined}
								className={cn(
									'flex items-center px-1 py-4 text-sm/6 font-semibold transition-colors',
									isCurrent
										? 'text-primary'
										: 'text-muted-foreground hover:text-foreground',
								)}
							>
								{item.name}
							</Link>
						);
					})}
				</div>
			</nav>
		</div>
	);
}
