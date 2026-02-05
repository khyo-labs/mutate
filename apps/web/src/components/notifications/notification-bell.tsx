import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, CheckCheck } from 'lucide-react';

import { notificationApi } from '@/api/notifications';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useWorkspaceStore } from '@/stores/workspace-store';
import type { Notification } from '@/types';

export function NotificationBell() {
	const { activeWorkspace } = useWorkspaceStore();
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const { data: unreadCount = 0 } = useQuery({
		queryKey: ['notifications', 'unread-count', activeWorkspace?.id],
		queryFn: () => notificationApi.getUnreadCount(activeWorkspace!.id),
		enabled: !!activeWorkspace,
		refetchInterval: 30000,
		refetchOnWindowFocus: true,
	});

	const { data: notificationsData } = useQuery({
		queryKey: ['notifications', activeWorkspace?.id],
		queryFn: () => notificationApi.list(activeWorkspace!.id, { limit: 10 }),
		enabled: !!activeWorkspace,
		refetchInterval: 30000,
		refetchOnWindowFocus: true,
	});

	const notifications = notificationsData?.data || [];

	const markAsReadMutation = useMutation({
		mutationFn: (notificationId: string) =>
			notificationApi.markAsRead(activeWorkspace!.id, notificationId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['notifications'] });
		},
	});

	const markAllAsReadMutation = useMutation({
		mutationFn: () => notificationApi.markAllAsRead(activeWorkspace!.id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['notifications'] });
		},
	});

	function handleNotificationClick(notification: Notification) {
		if (!notification.read) {
			markAsReadMutation.mutate(notification.id);
		}

		const metadata = notification.metadata as Record<string, string> | undefined;
		if (metadata?.configurationId) {
			navigate({
				to: '/mutations/$mutationId',
				params: { mutationId: metadata.configurationId },
			});
		}
	}

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="ghost" size="icon" className="relative h-8 w-8">
					<Bell className="h-4 w-4" />
					{unreadCount > 0 && (
						<span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
							{unreadCount > 99 ? '99+' : unreadCount}
						</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80 p-0">
				<div className="border-border flex items-center justify-between border-b px-4 py-3">
					<h4 className="text-sm font-semibold">Notifications</h4>
					{unreadCount > 0 && (
						<Button
							variant="ghost"
							size="sm"
							className="h-auto p-0 text-xs"
							onClick={() => markAllAsReadMutation.mutate()}
						>
							<CheckCheck className="mr-1 h-3 w-3" />
							Mark all read
						</Button>
					)}
				</div>
				<div className="max-h-80 overflow-y-auto">
					{notifications.length === 0 ? (
						<div className="py-8 text-center">
							<Bell className="text-muted-foreground mx-auto mb-2 h-6 w-6" />
							<p className="text-muted-foreground text-sm">No notifications</p>
						</div>
					) : (
						notifications.map((notification) => (
							<button
								key={notification.id}
								type="button"
								className="hover:bg-muted/50 flex w-full items-start gap-3 px-4 py-3 text-left transition-colors"
								onClick={() => handleNotificationClick(notification)}
							>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										{!notification.read && (
											<span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
										)}
										<span className="text-foreground truncate text-sm font-medium">
											{notification.title}
										</span>
									</div>
									<p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
										{notification.message}
									</p>
									<p className="text-muted-foreground mt-1 text-xs">
										{formatDistanceToNow(new Date(notification.createdAt), {
											addSuffix: true,
										})}
									</p>
								</div>
								{!notification.read && (
									<Button
										variant="ghost"
										size="icon"
										className="h-6 w-6 shrink-0"
										onClick={(e) => {
											e.stopPropagation();
											markAsReadMutation.mutate(notification.id);
										}}
									>
										<Check className="h-3 w-3" />
									</Button>
								)}
							</button>
						))
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
