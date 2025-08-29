import { Link, useRouter } from '@tanstack/react-router';
import {
	Building2,
	ChevronLeft,
	FileText,
	Home,
	LogOut,
	Menu,
	User,
	X,
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { useAuthStore, useSession } from '../stores/auth-store';

interface NavigationItem {
	name: string;
	href: string;
	icon: React.ComponentType<{ className?: string }>;
	badge?: string;
}

export function Sidebar() {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [isMobileOpen, setIsMobileOpen] = useState(false);
	const { logout } = useAuthStore();
	const { data: session } = useSession();
	const router = useRouter();

	const handleLogout = async () => {
		await logout();
	};

	const navigationItems: NavigationItem[] = [
		{ name: 'Dashboard', href: '/', icon: Home },
		{ name: 'Mutations', href: '/mutations', icon: FileText },
	];

	const bottomNavigationItems: NavigationItem[] = [
		{ name: 'Settings', href: '/settings/account', icon: User },
		{ name: 'Team Settings', href: '/settings/teams', icon: Building2 },
	];

	const isActiveRoute = (href: string) => {
		const currentPath = router.state.location.pathname;
		if (href === '/') {
			return currentPath === '/';
		}
		return currentPath.startsWith(href);
	};

	const SidebarContent = () => (
		<>
			{/* Header */}
			<div className="flex h-12 items-center justify-between px-3">
				<div className="flex items-center gap-2">
					<div className="bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded text-sm font-bold">
						M
					</div>
					{!isCollapsed && (
						<span className="text-sm font-semibold">mutate</span>
					)}
				</div>
				{!isCollapsed && (
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setIsCollapsed(!isCollapsed)}
						className="text-muted-foreground hover:text-foreground hidden h-7 w-7 lg:flex"
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
				)}
			</div>

			{/* Main Navigation */}
			<div className="flex-1 px-3">
				<nav className="space-y-1">
					{navigationItems.map((item) => {
						const Icon = item.icon;
						const isActive = isActiveRoute(item.href);

						return (
							<Link
								key={item.name}
								to={item.href}
								className={cn(
									'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-all duration-200',
									isActive
										? 'bg-primary text-primary-foreground shadow-sm'
										: 'text-muted-foreground hover:text-foreground hover:bg-accent/60',
									isCollapsed && 'justify-center px-2',
								)}
								onClick={() => setIsMobileOpen(false)}
							>
								<Icon className="h-5 w-5 flex-shrink-0" />
								{!isCollapsed && (
									<>
										<span className="flex-1 truncate">{item.name}</span>
										{item.badge && (
											<span className="bg-primary/10 text-primary rounded-full px-2 py-1 text-xs font-medium">
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

			{/* Bottom Section */}
			<div className="space-y-3 px-3">
				{/* Bottom Navigation */}
				<nav className="space-y-1">
					{bottomNavigationItems.map((item) => {
						const Icon = item.icon;
						const isActive = isActiveRoute(item.href);

						return (
							<Link
								key={item.name}
								to={item.href}
								className={cn(
									'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-all duration-200',
									isActive
										? 'bg-primary text-primary-foreground shadow-sm'
										: 'text-muted-foreground hover:text-foreground hover:bg-accent/60',
									isCollapsed && 'justify-center px-2',
								)}
								onClick={() => setIsMobileOpen(false)}
							>
								<Icon className="h-5 w-5 flex-shrink-0" />
								{!isCollapsed && (
									<span className="flex-1 truncate">{item.name}</span>
								)}
							</Link>
						);
					})}
				</nav>

				{/* User Section */}
				<div className="border-border border-t pb-2 pt-3">
					{!isCollapsed ? (
						<div className="hover:bg-accent/60 group flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 transition-colors">
							<div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-semibold text-white">
								{(session?.user?.name ||
									session?.user?.email)?.[0]?.toUpperCase()}
							</div>
							<div className="min-w-0 flex-1">
								<div className="text-foreground truncate text-sm font-medium">
									{session?.user?.name || session?.user?.email?.split('@')[0]}
								</div>
							</div>
							<Button
								variant="ghost"
								size="icon"
								onClick={handleLogout}
								className="text-muted-foreground hover:text-destructive h-6 w-6 opacity-0 transition-all group-hover:opacity-100"
							>
								<LogOut className="h-4 w-4" />
							</Button>
						</div>
					) : (
						<div className="flex justify-center">
							<Button
								variant="ghost"
								size="icon"
								onClick={handleLogout}
								className="text-muted-foreground hover:text-destructive h-9 w-9"
								title="Logout"
							>
								<LogOut className="h-4 w-4" />
							</Button>
						</div>
					)}
				</div>
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
					'bg-background fixed inset-y-0 left-0 z-50 w-60 transform transition-transform lg:hidden',
					isMobileOpen ? 'translate-x-0' : '-translate-x-full',
				)}
			>
				<div className="border-border flex h-full flex-col border-r">
					{/* Mobile Header */}
					<div className="flex h-12 items-center justify-between px-3">
						<div className="flex items-center gap-2">
							<div className="bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded text-sm font-bold">
								M
							</div>
							<span className="text-sm font-semibold">mutate</span>
						</div>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setIsMobileOpen(false)}
							className="text-muted-foreground hover:text-foreground h-7 w-7"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>

					{/* Mobile Main Navigation */}
					<div className="flex-1 px-3">
						<nav className="space-y-1">
							{navigationItems.map((item) => {
								const Icon = item.icon;
								const isActive = isActiveRoute(item.href);

								return (
									<Link
										key={item.name}
										to={item.href}
										className={cn(
											'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-all duration-200',
											isActive
												? 'bg-primary text-primary-foreground shadow-sm'
												: 'text-muted-foreground hover:text-foreground hover:bg-accent/60',
										)}
										onClick={() => setIsMobileOpen(false)}
									>
										<Icon className="h-5 w-5 flex-shrink-0" />
										<span className="flex-1 truncate">{item.name}</span>
										{item.badge && (
											<span className="bg-primary/10 text-primary rounded-full px-2 py-1 text-xs font-medium">
												{item.badge}
											</span>
										)}
									</Link>
								);
							})}
						</nav>
					</div>

					{/* Mobile Bottom Section */}
					<div className="space-y-3 px-3">
						{/* Mobile Bottom Navigation */}
						<nav className="space-y-1">
							{bottomNavigationItems.map((item) => {
								const Icon = item.icon;
								const isActive = isActiveRoute(item.href);

								return (
									<Link
										key={item.name}
										to={item.href}
										className={cn(
											'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-all duration-200',
											isActive
												? 'bg-primary text-primary-foreground shadow-sm'
												: 'text-muted-foreground hover:text-foreground hover:bg-accent/60',
										)}
										onClick={() => setIsMobileOpen(false)}
									>
										<Icon className="h-5 w-5 flex-shrink-0" />
										<span className="flex-1 truncate">{item.name}</span>
									</Link>
								);
							})}
						</nav>

						{/* Mobile User Section */}
						<div className="border-border border-t pb-2 pt-3">
							<div className="hover:bg-accent/60 group flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 transition-colors">
								<div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-semibold text-white">
									{(session?.user?.name ||
										session?.user?.email)?.[0]?.toUpperCase()}
								</div>
								<div className="min-w-0 flex-1">
									<div className="text-foreground truncate text-sm font-medium">
										{session?.user?.name || session?.user?.email?.split('@')[0]}
									</div>
								</div>
								<Button
									variant="ghost"
									size="icon"
									onClick={handleLogout}
									className="text-muted-foreground hover:text-destructive h-6 w-6 opacity-0 transition-all group-hover:opacity-100"
								>
									<LogOut className="h-4 w-4" />
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div
				className={cn(
					'lg:border-border lg:bg-background hidden lg:flex lg:flex-col lg:border-r',
					isCollapsed ? 'lg:w-14' : 'lg:w-60',
					'transition-all duration-300 ease-in-out',
				)}
			>
				<SidebarContent />
			</div>

			<Button
				variant="ghost"
				size="icon"
				className="fixed left-4 top-4 z-30 lg:hidden"
				onClick={() => setIsMobileOpen(true)}
			>
				<Menu className="h-4 w-4" />
			</Button>
		</>
	);
}
