import { Link, useLocation } from '@tanstack/react-router';

import { cn } from '@/lib/utils';

type NavigationItem = {
	name: string;
	href: string;
	icon: React.ComponentType<{ className?: string }>;
	description: string;
};

type Props = {
	navigationItems: NavigationItem[];
};

export function SettingsSidebar({ navigationItems }: Props) {
	const location = useLocation();

	return (
		<nav
			aria-label="Sections"
			className="hidden w-96 shrink-0 border-r border-slate-200 bg-white xl:flex xl:flex-col"
		>
			<div className="flex h-16 shrink-0 items-center border-b border-slate-200 px-6">
				<p className="text-lg font-medium text-slate-900">Settings</p>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto">
				{navigationItems.map((item) => {
					const isCurrent = location.pathname === item.href;

					return (
						<Link
							key={item.name}
							to={item.href}
							aria-current={isCurrent ? 'page' : undefined}
							className={cn(
								isCurrent ? 'bg-blue-50/50' : 'hover:bg-blue-50/50',
								'flex border-b border-slate-200 p-6',
							)}
						>
							<item.icon
								aria-hidden="true"
								className="-mt-0.5 size-6 shrink-0 text-slate-400"
							/>
							<div className="ml-3 text-sm">
								<p className="font-medium text-slate-900">{item.name}</p>
								<p className="mt-1 text-slate-500">{item.description}</p>
							</div>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
