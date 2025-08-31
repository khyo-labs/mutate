import { Link, useLocation } from '@tanstack/react-router';
import {
	Building2,
	ChevronDown,
	FileText,
	Home,
	LogOut,
	Menu,
	X,
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useMutations } from '@/hooks/use-mutations';
import { cn } from '@/lib/utils';
import { useAuthStore, useSession } from '@/stores/auth-store';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface NavigationItem {
	name: string;
	href: string;
	icon: React.ComponentType<{ className?: string }>;
	badge?: string;
}

export function Sidebar() {
	const [isCollapsed] = useState(false);
	const [isMobileOpen, setIsMobileOpen] = useState(false);
	const { logout } = useAuthStore();
	const { data: session } = useSession();
	const { data: mutations } = useMutations();
	const location = useLocation();

	async function handleLogout() {
		await logout();
	}

	const organizationName = session?.user.name || 'Mutate Inc.';
	const userEmail = session?.user?.email || 'admin@mutate.com';

	const navigationItems: NavigationItem[] = [
		{ name: 'Home', href: '/', icon: Home },
		{
			name: 'Mutations',
			href: '/mutations',
			icon: FileText,
			badge: mutations?.pagination?.total?.toString() || '0',
		},
	];

	const bottomNavigationItems: NavigationItem[] = [
		{
			name: 'Workspace Settings',
			href: '/settings/workspace',
			icon: Building2,
		},
	];

	function isActiveRoute(href: string) {
		const currentPath = location.pathname;
		if (href === '/') {
			return currentPath === '/';
		}
		return currentPath.startsWith(href);
	}

	const SidebarContent = () => (
		<>
			<div className="border-border border-b">
				<div className="px-4 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex h-8 w-8 items-center justify-center rounded bg-gray-800 text-sm font-bold text-white">
								M
							</div>
							{!isCollapsed && (
								<DropdownMenu>
									<DropdownMenuTrigger>
										<div className="flex-1">
											<div className="flex items-center gap-1">
												<span className="text-foreground text-sm font-semibold">
													{organizationName}
												</span>
												<ChevronDown className="text-muted-foreground hover:text-foreground size-4" />
											</div>
											<div className="text-muted-foreground text-xs">
												{userEmail}
											</div>
										</div>
									</DropdownMenuTrigger>
									<DropdownMenuContent>
										<DropdownMenuLabel>My Account</DropdownMenuLabel>
										<DropdownMenuSeparator />
										<DropdownMenuItem asChild>
											<Link to="/settings/account/profile">Profile</Link>
										</DropdownMenuItem>
										<DropdownMenuItem asChild>
											<Link to="/settings/account/appearance">Appearance</Link>
										</DropdownMenuItem>
										<DropdownMenuItem onClick={handleLogout}>
											Logout
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							)}
						</div>
					</div>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto px-3 py-3">
				<nav className="space-y-1">
					{navigationItems.map((item) => {
						const Icon = item.icon;
						const isActive = isActiveRoute(item.href);

						return (
							<Link
								key={item.name}
								to={item.href}
								className={cn(
									'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200',
									isActive
										? 'bg-accent text-foreground font-medium'
										: 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
									isCollapsed && 'justify-center px-2',
								)}
								onClick={() => setIsMobileOpen(false)}
							>
								<Icon className="h-4 w-4 flex-shrink-0" />
								{!isCollapsed && (
									<>
										<span className="flex-1">{item.name}</span>
										{item.badge && (
											<span
												className={cn(
													'rounded px-1.5 py-0.5 text-xs font-medium',
													item.badge === 'New'
														? 'bg-green-500/20 text-green-600 dark:text-green-400'
														: 'bg-muted text-muted-foreground',
												)}
											>
												{item.badge}
											</span>
										)}
									</>
								)}
							</Link>
						);
					})}
				</nav>
			</div>

			<div className="border-border border-t px-3 py-3">
				<nav className="space-y-1">
					{bottomNavigationItems.map((item) => {
						const Icon = item.icon;
						const isActive = isActiveRoute(item.href);

						return (
							<Link
								key={item.name}
								to={item.href}
								className={cn(
									'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200',
									isActive
										? 'bg-accent text-foreground font-medium'
										: 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
									isCollapsed && 'justify-center px-2',
								)}
								onClick={() => setIsMobileOpen(false)}
							>
								<Icon className="h-4 w-4 flex-shrink-0" />
								{!isCollapsed && <span className="flex-1">{item.name}</span>}
							</Link>
						);
					})}
				</nav>
			</div>
		</>
	);

	return (
		<>
			{isMobileOpen && (
				<div
					className="fixed inset-0 z-40 bg-black/50 lg:hidden"
					onClick={() => setIsMobileOpen(false)}
				/>
			)}

			<div
				className={cn(
					'bg-background fixed inset-y-0 left-0 z-50 w-64 transform transition-transform lg:hidden',
					isMobileOpen ? 'translate-x-0' : '-translate-x-full',
				)}
			>
				<div className="border-border flex h-full flex-col border-r">
					<div className="border-border flex items-center justify-between border-b px-4 py-4">
						<div className="flex items-center gap-3">
							<div className="flex h-8 w-8 items-center justify-center rounded bg-gray-800 text-sm font-bold text-white">
								#
							</div>
							<div>
								<div className="text-sm font-semibold">{organizationName}</div>
								<div className="text-muted-foreground text-xs">{userEmail}</div>
							</div>
						</div>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setIsMobileOpen(false)}
							className="text-muted-foreground hover:text-foreground h-8 w-8"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>

					<div className="flex-1 overflow-y-auto">
						<div className="px-3 py-3">
							<nav className="space-y-1">
								{navigationItems.map((item) => {
									const Icon = item.icon;
									const isActive = isActiveRoute(item.href);

									return (
										<Link
											key={item.name}
											to={item.href}
											className={cn(
												'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200',
												isActive
													? 'bg-accent text-foreground font-medium'
													: 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
											)}
											onClick={() => setIsMobileOpen(false)}
										>
											<Icon className="h-4 w-4 flex-shrink-0" />
											<span className="flex-1">{item.name}</span>
											{item.badge && (
												<span
													className={cn(
														'rounded px-1.5 py-0.5 text-xs font-medium',
														item.badge === 'New'
															? 'bg-green-500/20 text-green-600 dark:text-green-400'
															: 'bg-muted text-muted-foreground',
													)}
												>
													{item.badge}
												</span>
											)}
										</Link>
									);
								})}
							</nav>
						</div>
					</div>

					<div className="border-border border-t px-3 py-3">
						<nav className="space-y-1">
							{bottomNavigationItems.map((item) => {
								const Icon = item.icon;
								const isActive = isActiveRoute(item.href);

								return (
									<Link
										key={item.name}
										to={item.href}
										className={cn(
											'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200',
											isActive
												? 'bg-accent text-foreground font-medium'
												: 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
										)}
										onClick={() => setIsMobileOpen(false)}
									>
										<Icon className="h-4 w-4 flex-shrink-0" />
										<span className="flex-1">{item.name}</span>
									</Link>
								);
							})}
							<button
								onClick={handleLogout}
								className="text-muted-foreground hover:bg-accent/50 hover:text-destructive flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200"
							>
								<LogOut className="h-4 w-4 flex-shrink-0" />
								<span className="flex-1 text-left">Logout</span>
							</button>
						</nav>
					</div>
				</div>
			</div>

			<div
				className={cn(
					'lg:border-border lg:bg-background hidden lg:flex lg:flex-col lg:border-r',
					isCollapsed ? 'lg:w-16' : 'lg:w-64',
					'transition-all duration-300 ease-in-out',
				)}
			>
				<SidebarContent />
			</div>

			<Button
				variant="ghost"
				size="icon"
				className="fixed left-4 top-4 z-30 h-10 w-10 lg:hidden"
				onClick={() => setIsMobileOpen(true)}
			>
				<Menu className="h-5 w-5" />
			</Button>
		</>
	);
}
