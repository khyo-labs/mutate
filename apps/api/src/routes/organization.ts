import { eq } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';

import { db } from '../db/connection.js';
import { organization, organizationWebhooks } from '../db/schema.js';
import { auth } from '../lib/auth.js';
import { authenticateSession } from '../middleware/auth.js';
import {
	createOrganizationSchema,
	createOrganizationWebhookSchema,
	setDefaultWebhookSchema,
	updateOrganizationWebhookSchema,
} from '../schemas/organization.js';
import { WebhookService } from '../services/webhook.js';
import { getErrorMessage } from '../utils/error.js';

export async function organizationRoutes(fastify: FastifyInstance) {
	fastify.addHook('preHandler', authenticateSession);

	fastify.post('/create', async (request, reply) => {
		try {
			const body = createOrganizationSchema.parse(request.body);
			const result = await auth.api.createOrganization({
				body: {
					name: body.name,
					slug: body.slug,
					logo: body.logo,
					userId: request.currentUser?.id,
					metadata: body.metadata,
					keepCurrentActiveOrganization: body.switchOrganization,
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
				error: getErrorMessage(error, 'Failed to create organization'),
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
				error: getErrorMessage(error, 'Failed to check organization slug'),
			});
		}
	});

	// Get all webhooks for current organization
	fastify.get('/webhooks', async (request, reply) => {
		try {
			const currentOrganizationId = request.currentUser?.organizationId;
			const { includeSecrets } = request.query as { includeSecrets?: string };

			if (!currentOrganizationId) {
				return reply.status(400).send({
					success: false,
					error: 'No active organization',
				});
			}

			const webhooks = await db.query.organizationWebhooks.findMany({
				where: eq(organizationWebhooks.organizationId, currentOrganizationId),
				columns: {
					id: true,
					name: true,
					url: true,
					isDefault: true,
					createdAt: true,
					updatedAt: true,
					secret: true, // Include secret to check if it exists
				},
			});

			return reply.send({
				success: true,
				data: webhooks.map((webhook) => ({
					...webhook,
					hasSecret: Boolean(webhook.secret),
					secret: includeSecrets === 'true' ? webhook.secret : undefined,
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

	// Create new webhook for current organization
	fastify.post('/webhooks', async (request, reply) => {
		try {
			const currentOrganizationId = request.currentUser?.organizationId;

			if (!currentOrganizationId) {
				return reply.status(400).send({
					success: false,
					error: 'No active organization',
				});
			}

			const body = createOrganizationWebhookSchema.parse(request.body);

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

			// If this is set as default, unset any existing default
			if (body.isDefault) {
				await db
					.update(organizationWebhooks)
					.set({ isDefault: false })
					.where(
						eq(organizationWebhooks.organizationId, currentOrganizationId),
					);
			}

			// Create the webhook
			await db.insert(organizationWebhooks).values({
				id: webhookId,
				organizationId: currentOrganizationId,
				name: body.name,
				url: body.url,
				secret: body.secret,
				isDefault: body.isDefault,
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
					error: 'No active organization',
				});
			}

			const body = updateOrganizationWebhookSchema.parse(request.body);

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

			// Check if webhook exists and belongs to organization
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
					error: 'No active organization',
				});
			}

			// Check if webhook exists and belongs to organization
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

	// Set webhook as default
	fastify.post('/webhooks/:id/set-default', async (request, reply) => {
		try {
			const currentOrganizationId = request.currentUser?.organizationId;
			const { id: webhookId } = request.params as { id: string };

			if (!currentOrganizationId) {
				return reply.status(400).send({
					success: false,
					error: 'No active organization',
				});
			}

			// Check if webhook exists and belongs to organization
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

			// Unset all defaults for this organization
			await db
				.update(organizationWebhooks)
				.set({ isDefault: false })
				.where(eq(organizationWebhooks.organizationId, currentOrganizationId));

			// Set this webhook as default
			await db
				.update(organizationWebhooks)
				.set({ isDefault: true })
				.where(eq(organizationWebhooks.id, webhookId));

			return reply.send({
				success: true,
				data: { message: 'Webhook set as default successfully' },
			});
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({
				success: false,
				error: getErrorMessage(error, 'Failed to set default webhook'),
			});
		}
	});
}
