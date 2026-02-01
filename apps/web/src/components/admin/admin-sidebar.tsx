import { Link, useLocation } from '@tanstack/react-router';
import {
	Activity,
	Building2,
	ChevronDown,
	CreditCard,
	LayoutDashboard,
	LogOut,
	Shield,
	ToggleLeft,
	Users,
	Wrench,
} from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore, useSession } from '@/stores/auth-store';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface NavigationItem {
	name: string;
	href: string;
	icon: React.ComponentType<{ className?: string }>;
	badge?: string;
}

export function AdminSidebar() {
	const [isCollapsed] = useState(false);
	const { logout } = useAuthStore();
	const { data: session } = useSession();
	const location = useLocation();

	async function handleLogout() {
		await logout();
	}

	const adminNavItems: NavigationItem[] = [
		{
			name: 'Platform Overview',
			href: '/admin',
			icon: LayoutDashboard,
		},
		{
			name: 'Workspaces',
			href: '/admin/workspaces',
			icon: Building2,
		},
		{
			name: 'Users',
			href: '/admin/users',
			icon: Users,
		},
		{
			name: 'Billing & Usage',
			href: '/admin/billing',
			icon: CreditCard,
		},
		{
			name: 'Audit Logs',
			href: '/admin/audit',
			icon: Shield,
		},
		{
			name: 'System Health',
			href: '/admin/health',
			icon: Activity,
			badge: 'Live',
		},
		{
			name: 'Support Tools',
			href: '/admin/support',
			icon: Wrench,
		},
		{
			name: 'Feature Flags',
			href: '/admin/features',
			icon: ToggleLeft,
		},
	];

	function isActiveRoute(href: string) {
		const currentPath = location.pathname;
		if (href === '/admin') {
			return currentPath === '/admin';
		}
		return currentPath.startsWith(href);
	}

	return (
		<div
			className={cn(
				'lg:border-border lg:bg-background flex flex-col border-r',
				isCollapsed ? 'lg:w-16' : 'lg:w-64',
				'transition-all duration-300 ease-in-out',
			)}
		>
			<div className="border-border border-b">
				<div className="px-4 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded">
								<Shield className="h-4 w-4" />
							</div>
							{!isCollapsed && (
								<div className="flex-1">
									<div className="flex items-center gap-1">
										<span className="text-foreground text-sm font-semibold">Platform Admin</span>
										<Badge variant="outline" className="ml-2 text-xs">
											2FA Active
										</Badge>
									</div>
									<div className="text-muted-foreground text-xs">{session?.user?.email}</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto px-3 py-3">
				<nav className="grid gap-y-1">
					{adminNavItems.map((item) => {
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
							>
								<Icon className="h-4 w-4 flex-shrink-0" />
								{!isCollapsed && (
									<>
										<span className="flex-1">{item.name}</span>
										{item.badge && (
											<Badge
												variant={item.badge === 'Live' ? 'default' : 'secondary'}
												className="text-xs"
											>
												{item.badge}
											</Badge>
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
					{!isCollapsed ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" className="w-full justify-start text-sm" size="sm">
									<div className="flex items-center gap-2">
										<div className="bg-muted flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium">
											{session?.user?.name?.[0]?.toUpperCase() || 'A'}
										</div>
										<span className="flex-1 text-left">Admin Menu</span>
										<ChevronDown className="h-4 w-4" />
									</div>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-56">
								<DropdownMenuLabel>Admin Options</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem asChild>
									<Link to="/settings/account/profile">Profile Settings</Link>
								</DropdownMenuItem>
								<DropdownMenuItem asChild>
									<Link to="/">Exit Admin Mode</Link>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={handleLogout} className="text-destructive">
									<LogOut className="mr-2 h-4 w-4" />
									Logout
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					) : (
						<Button
							variant="ghost"
							size="icon"
							onClick={handleLogout}
							className="text-muted-foreground hover:text-destructive w-full"
						>
							<LogOut className="h-4 w-4" />
						</Button>
					)}
				</nav>
			</div>
		</div>
	);
}
