import type { Notification } from '@/types';

import { api } from './client';

type NotificationListResponse = {
	success: boolean;
	data: Notification[];
	pagination: { total: number };
};

type UnreadCountResponse = {
	success: boolean;
	data: { count: number };
};

export const notificationApi = {
	list: async function (
		workspaceId: string,
		params?: { limit?: number; offset?: number; unreadOnly?: boolean },
	): Promise<NotificationListResponse> {
		const searchParams = new URLSearchParams();
		if (params?.limit) searchParams.append('limit', params.limit.toString());
		if (params?.offset) searchParams.append('offset', params.offset.toString());
		if (params?.unreadOnly) searchParams.append('unreadOnly', 'true');

		let url = `/v1/workspace/${workspaceId}/notifications`;
		if (searchParams.toString()) {
			url += `?${searchParams.toString()}`;
		}

		return api.get<NotificationListResponse>(url);
	},

	getUnreadCount: async function (workspaceId: string): Promise<number> {
		const response = await api.get<UnreadCountResponse>(
			`/v1/workspace/${workspaceId}/notifications/unread-count`,
		);
		return response.data.count;
	},

	markAsRead: async function (workspaceId: string, notificationId: string): Promise<void> {
		await api.patch(`/v1/workspace/${workspaceId}/notifications/${notificationId}/read`, {});
	},

	markAllAsRead: async function (workspaceId: string): Promise<void> {
		await api.post(`/v1/workspace/${workspaceId}/notifications/mark-all-read`);
	},
};
