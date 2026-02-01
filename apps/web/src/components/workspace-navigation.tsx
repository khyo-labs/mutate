import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { Check, FileText, Key, MoreHorizontal, Plus, Users, Webhook } from 'lucide-react';

import { useMutations } from '@/hooks/use-mutations';
import { useListWorkspace } from '@/hooks/use-workspaces';
import { cn, getInitials } from '@/lib/utils';
import { router } from '@/main';
import { useWorkspaceStore } from '@/stores/workspace-store';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from './ui/dropdown-menu';

type NavigationItem = {
	name: string;
	href: string;
	icon: React.ComponentType<{ className?: string }>;
	badge?: string;
};

type Props = {
	isCollapsed?: boolean;
	setIsMobileOpen: (isOpen: boolean) => void;
};

export function WorkspaceNavigation({ isCollapsed = false, setIsMobileOpen }: Props) {
	const location = useLocation();
	const navigate = useNavigate();
	const { data: mutations } = useMutations();
	const { data: workspaces } = useListWorkspace();
	const { activeWorkspace, setActiveWorkspace } = useWorkspaceStore();

	const workspaceItems: NavigationItem[] = [
		{
			name: 'Mutations',
			href: '/mutations',
			icon: FileText,
			badge: mutations?.pagination?.total?.toString() || '0',
		},
	];

	const moreItems: NavigationItem[] = [
		{
			name: 'Webhooks',
			href: '/settings/workspace/webhooks',
			icon: Webhook,
		},
		{
			name: 'API Keys',
			href: '/settings/workspace/api-keys',
			icon: Key,
		},
		{
			name: 'Members',
			href: '/settings/workspace/members',
			icon: Users,
		},
	];

	function isActiveRoute(href: string) {
		const currentPath = location.pathname;
		if (href === '/') {
			return currentPath === '/';
		}
		return currentPath.startsWith(href);
	}

	return (
		<div className="space-y-1">
			<h3 className="text-muted-foreground px-3 text-xs font-semibold tracking-wider uppercase">
				Workspace
			</h3>
			{workspaceItems.map((item) => {
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

			<div className="space-y-1">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							className={cn(
								'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200',
								'text-muted-foreground hover:text-foreground hover:bg-accent/50',
								isCollapsed && 'justify-center px-2',
							)}
						>
							<MoreHorizontal className="h-4 w-4 flex-shrink-0" />
							{!isCollapsed && <span className="flex-1 text-left">More</span>}
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-56">
						{moreItems.map((item) => (
							<DropdownMenuItem asChild key={item.name}>
								<Link
									to={item.href}
									onClick={() => setIsMobileOpen(false)}
									className="flex items-center gap-2"
								>
									<item.icon className="h-4 w-4" />
									{item.name}
								</Link>
							</DropdownMenuItem>
						))}
						{workspaces && workspaces.length > 0 && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuSub>
									<DropdownMenuSubTrigger className="flex items-center justify-between">
										<span>Switch workspace</span>
									</DropdownMenuSubTrigger>
									<DropdownMenuSubContent className="w-64">
										<div className="p-2">
											{workspaces.map((workspace) => (
												<DropdownMenuItem
													key={workspace.id}
													onClick={() => {
														if (activeWorkspace?.id === workspace.id) {
															return;
														}
														setActiveWorkspace(workspace);
														router.navigate({ to: '/' });
													}}
													className="flex items-center justify-between px-2 py-2"
												>
													<div className="flex items-center gap-2">
														<div className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded text-xs font-bold">
															{getInitials(workspace.name)}
														</div>
														<span className="text-sm">{workspace.name}</span>
													</div>
													{activeWorkspace?.id === workspace.id && (
														<Check className="h-4 w-4 text-green-600" />
													)}
												</DropdownMenuItem>
											))}
											<DropdownMenuSeparator />
											<DropdownMenuItem
												onClick={() => {
													navigate({ to: '/join' });
													setIsMobileOpen(false);
												}}
												className="flex items-center gap-2 px-2 py-2"
											>
												<Plus className="h-4 w-4" />
												<span className="text-sm">Create a workspace</span>
											</DropdownMenuItem>
										</div>
									</DropdownMenuSubContent>
								</DropdownMenuSub>
							</>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}
