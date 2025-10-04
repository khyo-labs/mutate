import { eq } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';

import { db } from '@/db/connection.js';
import { organizationWebhooks } from '@/db/schema.js';
import { validateWorkspaceAccess } from '@/middleware/workspace-access.js';
import {
	createWorkspaceWebhookSchema,
	updateWorkspaceWebhookSchema,
} from '@/schemas/workspace.js';
import { WebhookService } from '@/services/webhook.js';
import '@/types/fastify.js';
import { getErrorMessage } from '@/utils/error.js';

export async function webhookRoutes(fastify: FastifyInstance) {
	// All webhook routes require authentication and workspace access
	fastify.addHook('preHandler', async (request, reply) => {
		await fastify.authenticate(request, reply);
		await validateWorkspaceAccess(request, reply);
	});

	// Get all webhooks for workspace
	fastify.get('/', async (request, reply) => {
		try {
			const workspaceId = request.workspace!.id;

			const webhooks = await db.query.organizationWebhooks.findMany({
				where: eq(organizationWebhooks.organizationId, workspaceId),
				columns: {
					id: true,
					name: true,
					url: true,
					lastUsedAt: true,
					createdAt: true,
					updatedAt: true,
					secret: true,
				},
			});

			return reply.send({
				success: true,
				data: webhooks,
			});
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({
				success: false,
				error: getErrorMessage(error, 'Failed to get webhooks'),
			});
		}
	});

	// Create new webhook for workspace
	fastify.post('/', async (request, reply) => {
		try {
			const workspaceId = request.workspace!.id;
			const body = createWorkspaceWebhookSchema.parse(request.body);

			// Validate webhook URL
			const validation = WebhookService.validateWebhookUrl(body.url);
			if (!validation.valid) {
				return reply.status(400).send({
					success: false,
					error: validation.error,
				});
			}

			// Generate ID for webhook
			const webhookId = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

			// Create the webhook
			await db.insert(organizationWebhooks).values({
				id: webhookId,
				organizationId: workspaceId,
				name: body.name,
				url: body.url,
				secret: body.secret,
			});

			return reply.send({
				success: true,
				data: { message: 'Webhook created successfully', id: webhookId },
			});
		} catch (error) {
			fastify.log.error(error);
			return reply.status(400).send({
				success: false,
				error: getErrorMessage(error, 'Failed to create webhook'),
			});
		}
	});

	// Update webhook
	fastify.patch('/:id', async (request, reply) => {
		try {
			const workspaceId = request.workspace!.id;
			const { id: webhookId } = request.params as { id: string };

			const body = updateWorkspaceWebhookSchema.parse(request.body);

			// Validate webhook URL if provided
			if (body.url) {
				const validation = WebhookService.validateWebhookUrl(body.url);
				if (!validation.valid) {
					return reply.status(400).send({
						success: false,
						error: validation.error,
					});
				}
			}

			// Check if webhook exists and belongs to workspace
			const existingWebhook = await db.query.organizationWebhooks.findFirst({
				where: eq(organizationWebhooks.id, webhookId),
			});

			if (!existingWebhook || existingWebhook.organizationId !== workspaceId) {
				return reply.status(404).send({
					success: false,
					error: 'Webhook not found',
				});
			}

			await db
				.update(organizationWebhooks)
				.set({
					...body,
					updatedAt: new Date(),
				})
				.where(eq(organizationWebhooks.id, webhookId));

			return reply.send({
				success: true,
				data: { message: 'Webhook updated successfully' },
			});
		} catch (error) {
			fastify.log.error(error);
			return reply.status(400).send({
				success: false,
				error: getErrorMessage(error, 'Failed to update webhook'),
			});
		}
	});

	// Delete webhook
	fastify.delete('/:id', async (request, reply) => {
		try {
			const workspaceId = request.workspace!.id;
			const { id: webhookId } = request.params as { id: string };

			// Check if webhook exists and belongs to workspace
			const existingWebhook = await db.query.organizationWebhooks.findFirst({
				where: eq(organizationWebhooks.id, webhookId),
			});

			if (!existingWebhook || existingWebhook.organizationId !== workspaceId) {
				return reply.status(404).send({
					success: false,
					error: 'Webhook not found',
				});
			}

			await db
				.delete(organizationWebhooks)
				.where(eq(organizationWebhooks.id, webhookId));

			return reply.send({
				success: true,
				data: { message: 'Webhook deleted successfully' },
			});
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({
				success: false,
				error: getErrorMessage(error, 'Failed to delete webhook'),
			});
		}
	});
}
