import { Link } from '@tanstack/react-router';

type NavigationItem = {
	name: string;
	href: string;
	icon: React.ComponentType<{ className?: string }>;
	description: string;
};

type Props = {
	navigationItems: NavigationItem[];
	title: string;
	titleIcon: React.ComponentType<{ className?: string }>;
};

export function SettingsNavigationView({
	navigationItems,
	title,
	titleIcon: TitleIcon,
}: Props) {
	return (
		<div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12 xl:hidden">
			<div className="mb-6 flex items-center gap-3">
				<TitleIcon className="h-6 w-6" />
				<h1 className="text-3xl font-bold tracking-tight text-slate-900">
					{title}
				</h1>
			</div>

			<div className="space-y-1">
				{navigationItems.map((item) => {
					const Icon = item.icon;

					return (
						<Link
							key={item.name}
							to={item.href}
							className="group flex items-center rounded-lg border border-transparent p-4 transition-all duration-200 hover:border-blue-200/50 hover:bg-blue-50/50"
						>
							<Icon className="size-6 text-slate-400 transition-colors group-hover:text-blue-500" />
							<div className="ml-4">
								<p className="text-base font-medium text-slate-900 group-hover:text-blue-700">
									{item.name}
								</p>
								<p className="mt-1 text-sm text-slate-500">
									{item.description}
								</p>
							</div>
							<svg
								className="ml-auto size-5 text-slate-400 transition-colors group-hover:text-blue-500"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fillRule="evenodd"
									d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
									clipRule="evenodd"
								/>
							</svg>
						</Link>
					);
				})}
			</div>
		</div>
	);
}
