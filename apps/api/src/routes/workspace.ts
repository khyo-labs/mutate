import { eq } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';

import { db } from '../db/connection.js';
import { organization, organizationWebhooks } from '../db/schema.js';
import { auth } from '../lib/auth.js';
import { authenticateSession } from '../middleware/auth.js';
import {
	createWorkspaceSchema,
	createWorkspaceWebhookSchema,
	updateWorkspaceWebhookSchema,
} from '../schemas/workspace.js';
import { WebhookService } from '../services/webhook.js';
import { getErrorMessage } from '../utils/error.js';

export async function workspaceRoutes(fastify: FastifyInstance) {
	fastify.addHook('preHandler', authenticateSession);

	fastify.get('/', async (request, reply) => {
		try {
			const result = await auth.api.listOrganizations({
				headers: request.headers as any,
			});

			return reply.send({
				success: true,
				data: result,
			});
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({
				success: false,
				error: getErrorMessage(error, 'Failed to list workspaces'),
			});
		}
	});

	fastify.post('/create', async (request, reply) => {
		try {
			const body = createWorkspaceSchema.parse(request.body);
			const result = await auth.api.createOrganization({
				body: {
					name: body.name,
					slug: body.slug,
					logo: body.logo,
					userId: request.currentUser?.id,
					metadata: body.metadata,
					keepCurrentActiveOrganization: body.switchWorkspace,
				},
				headers: request.headers as any,
			});

			return reply.send({
				success: true,
				data: result,
			});
		} catch (error) {
			fastify.log.error(error);
			return reply.status(400).send({
				success: false,
				error: getErrorMessage(error, 'Failed to create workspace'),
			});
		}
	});

	fastify.post('/exists', async (request, reply) => {
		try {
			const { slug } = request.body as { slug: string };
			const result = await auth.api.checkOrganizationSlug({
				body: {
					slug,
				},
			});

			console.log('result', result);

			return reply.send({
				success: true,
				data: result,
			});
		} catch (error) {
			fastify.log.error(error);
			return reply.status(400).send({
				success: false,
				error: getErrorMessage(error, 'Failed to check workspace slug'),
			});
		}
	});

	// Get all webhooks for current workspace
	fastify.get('/webhooks', async (request, reply) => {
		try {
			const currentOrganizationId = request.currentUser?.organizationId;

			if (!currentOrganizationId) {
				return reply.status(400).send({
					success: false,
					error: 'No active workspace',
				});
			}

			const webhooks = await db.query.organizationWebhooks.findMany({
				where: eq(organizationWebhooks.organizationId, currentOrganizationId),
				columns: {
					id: true,
					name: true,
					url: true,
					lastUsedAt: true,
					createdAt: true,
					updatedAt: true,
					secret: true, // Include secret to check if it exists
				},
			});

			return reply.send({
				success: true,
				data: webhooks.map((webhook) => ({
					...webhook,
					secret: webhook.secret,
				})),
			});
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({
				success: false,
				error: getErrorMessage(error, 'Failed to get webhooks'),
			});
		}
	});

	// Create new webhook for current workspace
	fastify.post('/webhooks', async (request, reply) => {
		try {
			const currentOrganizationId = request.currentUser?.organizationId;

			if (!currentOrganizationId) {
				return reply.status(400).send({
					success: false,
					error: 'No active workspace',
				});
			}

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
				organizationId: currentOrganizationId,
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
	fastify.patch('/webhooks/:id', async (request, reply) => {
		try {
			const currentOrganizationId = request.currentUser?.organizationId;
			const { id: webhookId } = request.params as { id: string };

			if (!currentOrganizationId) {
				return reply.status(400).send({
					success: false,
					error: 'No active workspace',
				});
			}

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

			if (
				!existingWebhook ||
				existingWebhook.organizationId !== currentOrganizationId
			) {
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
	fastify.delete('/webhooks/:id', async (request, reply) => {
		try {
			const currentOrganizationId = request.currentUser?.organizationId;
			const { id: webhookId } = request.params as { id: string };

			if (!currentOrganizationId) {
				return reply.status(400).send({
					success: false,
					error: 'No active workspace',
				});
			}

			// Check if webhook exists and belongs to workspace
			const existingWebhook = await db.query.organizationWebhooks.findFirst({
				where: eq(organizationWebhooks.id, webhookId),
			});

			if (
				!existingWebhook ||
				existingWebhook.organizationId !== currentOrganizationId
			) {
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
