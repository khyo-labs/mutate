import type { FastifyInstance } from 'fastify';

import { validateWorkspaceAccess } from '@/middleware/workspace-access.js';
import { NotificationService } from '@/services/notification.js';
import '@/types/fastify.js';
import { getErrorMessage } from '@/utils/error.js';

export async function notificationRoutes(fastify: FastifyInstance) {
	fastify.addHook('preHandler', async (request, reply) => {
		await fastify.authenticate(request, reply);
		await validateWorkspaceAccess(request, reply);
	});

	fastify.get('/', async (request, reply) => {
		try {
			const workspaceId = request.workspace!.id;
			const { limit, offset, unreadOnly } = request.query as {
				limit?: string;
				offset?: string;
				unreadOnly?: string;
			};

			const result = await NotificationService.getNotifications(workspaceId, {
				limit: limit ? parseInt(limit, 10) : 20,
				offset: offset ? parseInt(offset, 10) : 0,
				unreadOnly: unreadOnly === 'true',
			});

			return reply.send({
				success: true,
				data: result.data,
				pagination: { total: result.total },
			});
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({
				success: false,
				error: {
					code: 'FAILED_TO_GET_NOTIFICATIONS',
					message: getErrorMessage(error, 'Failed to get notifications'),
				},
			});
		}
	});

	fastify.get('/unread-count', async (request, reply) => {
		try {
			const workspaceId = request.workspace!.id;
			const count = await NotificationService.getUnreadCount(workspaceId);
			return reply.send({ success: true, data: { count } });
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({
				success: false,
				error: {
					code: 'FAILED_TO_GET_UNREAD_COUNT',
					message: getErrorMessage(error, 'Failed to get unread count'),
				},
			});
		}
	});

	fastify.patch('/:notificationId/read', async (request, reply) => {
		try {
			const workspaceId = request.workspace!.id;
			const { notificationId } = request.params as { notificationId: string };

			const updated = await NotificationService.markAsRead(notificationId, workspaceId);
			if (!updated) {
				return reply.status(404).send({
					success: false,
					error: {
						code: 'NOTIFICATION_NOT_FOUND',
						message: 'Notification not found',
					},
				});
			}

			return reply.send({ success: true, data: { message: 'Notification marked as read' } });
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({
				success: false,
				error: {
					code: 'FAILED_TO_MARK_AS_READ',
					message: getErrorMessage(error, 'Failed to mark notification as read'),
				},
			});
		}
	});

	fastify.post('/mark-all-read', async (request, reply) => {
		try {
			const workspaceId = request.workspace!.id;
			await NotificationService.markAllAsRead(workspaceId);
			return reply.send({ success: true, data: { message: 'All notifications marked as read' } });
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({
				success: false,
				error: {
					code: 'FAILED_TO_MARK_ALL_READ',
					message: getErrorMessage(error, 'Failed to mark all notifications as read'),
				},
			});
		}
	});
}
