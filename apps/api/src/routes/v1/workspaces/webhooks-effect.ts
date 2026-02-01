import { eq } from 'drizzle-orm';
import { Effect } from 'effect';
import type { FastifyInstance, FastifyRequest } from 'fastify';

import { db } from '@/db/connection.js';
import { organizationWebhooks } from '@/db/schema.js';
import { effectHandler } from '@/effect/adapters/fastify.js';
import { WebhookService, WebhookValidationError } from '@/effect/services/webhook.service.js';
import { validateWorkspaceAccess } from '@/middleware/workspace-access.js';
import { createWorkspaceWebhookSchema, updateWorkspaceWebhookSchema } from '@/schemas/workspace.js';
import '@/types/fastify.js';

interface CreateWebhookBody {
	name: string;
	url: string;
	secret?: string;
}

interface UpdateWebhookBody {
	name?: string;
	url?: string;
	secret?: string;
}

interface WebhookParams {
	id: string;
}

export async function webhookRoutesEffect(fastify: FastifyInstance) {
	// All webhook routes require authentication and workspace access
	fastify.addHook('preHandler', async (request, reply) => {
		await fastify.authenticate(request, reply);
		await validateWorkspaceAccess(request, reply);
	});

	// Get all webhooks for workspace
	fastify.get(
		'/',
		effectHandler(
			(req: FastifyRequest) =>
				Effect.gen(function* () {
					const workspaceId = req.workspace!.id;

					const webhooks = yield* Effect.tryPromise({
						try: () =>
							db.query.organizationWebhooks.findMany({
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
							}),
						catch: (error) => ({
							code: 'DB_ERROR',
							message: 'Failed to fetch webhooks',
						}),
					});

					return webhooks;
				}),
			{
				onSuccess: (data) => ({
					status: 200,
					body: { success: true, data },
				}),
				onError: (error) => ({
					status: 500,
					body: {
						success: false,
						error: error,
					},
				}),
			},
		),
	);

	// Create new webhook for workspace
	fastify.post<{ Body: CreateWebhookBody }>(
		'/',
		{
			schema: {
				body: {
					type: 'object',
					required: ['name', 'url'],
					properties: {
						name: { type: 'string' },
						url: { type: 'string' },
						secret: { type: 'string' },
					},
				},
			},
		},
		effectHandler(
			(req: FastifyRequest<{ Body: CreateWebhookBody }>) =>
				Effect.gen(function* () {
					const webhookService = yield* WebhookService;
					const workspaceId = req.workspace!.id;

					// Validate request body
					const body = yield* Effect.try({
						try: () => createWorkspaceWebhookSchema.parse(req.body),
						catch: (error) => ({
							code: 'VALIDATION_ERROR',
							message: 'Invalid request data',
						}),
					});

					// Validate webhook URL
					yield* webhookService.validateWebhookUrl(body.url).pipe(
						Effect.mapError((error) => ({
							code: 'INVALID_URL',
							message: error.message,
						})),
					);

					// Generate ID for webhook
					const webhookId = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

					// Create the webhook
					yield* Effect.tryPromise({
						try: () =>
							db.insert(organizationWebhooks).values({
								id: webhookId,
								organizationId: workspaceId,
								name: body.name,
								url: body.url,
								secret: body.secret,
							}),
						catch: (error) => ({
							code: 'DB_ERROR',
							message: 'Failed to create webhook',
						}),
					});

					return { message: 'Webhook created successfully', id: webhookId };
				}),
			{
				onSuccess: (data) => ({
					status: 200,
					body: { success: true, data },
				}),
				onError: (error) => ({
					status: 400,
					body: {
						success: false,
						error: error,
					},
				}),
			},
		),
	);

	// Update webhook
	fastify.patch<{ Params: WebhookParams; Body: UpdateWebhookBody }>(
		'/:id',
		{
			schema: {
				params: {
					type: 'object',
					properties: {
						id: { type: 'string' },
					},
					required: ['id'],
				},
				body: {
					type: 'object',
					properties: {
						name: { type: 'string' },
						url: { type: 'string' },
						secret: { type: 'string' },
					},
				},
			},
		},
		effectHandler(
			(req: FastifyRequest<{ Params: WebhookParams; Body: UpdateWebhookBody }>) =>
				Effect.gen(function* () {
					const webhookService = yield* WebhookService;
					const workspaceId = req.workspace!.id;
					const { id: webhookId } = req.params;

					// Validate request body
					const body = yield* Effect.try({
						try: () => updateWorkspaceWebhookSchema.parse(req.body),
						catch: (error) => ({
							code: 'VALIDATION_ERROR',
							message: 'Invalid request data',
						}),
					});

					// Validate webhook URL if provided
					if (body.url) {
						yield* webhookService.validateWebhookUrl(body.url).pipe(
							Effect.mapError((error) => ({
								code: 'INVALID_URL',
								message: error.message,
							})),
						);
					}

					// Check if webhook exists and belongs to workspace
					const existingWebhook = yield* Effect.tryPromise({
						try: () =>
							db.query.organizationWebhooks.findFirst({
								where: eq(organizationWebhooks.id, webhookId),
							}),
						catch: () => ({
							code: 'DB_ERROR',
							message: 'Failed to fetch webhook',
						}),
					});

					if (!existingWebhook || existingWebhook.organizationId !== workspaceId) {
						return yield* Effect.fail({
							code: 'NOT_FOUND',
							message: 'Webhook not found',
						});
					}

					// Update the webhook
					yield* Effect.tryPromise({
						try: () =>
							db
								.update(organizationWebhooks)
								.set({
									...body,
									updatedAt: new Date(),
								})
								.where(eq(organizationWebhooks.id, webhookId)),
						catch: (error) => ({
							code: 'DB_ERROR',
							message: 'Failed to update webhook',
						}),
					});

					return { message: 'Webhook updated successfully' };
				}),
			{
				onSuccess: (data) => ({
					status: 200,
					body: { success: true, data },
				}),
				onError: (error) => ({
					status: error.code === 'NOT_FOUND' ? 404 : 400,
					body: {
						success: false,
						error: error,
					},
				}),
			},
		),
	);

	// Delete webhook
	fastify.delete<{ Params: WebhookParams }>(
		'/:id',
		{
			schema: {
				params: {
					type: 'object',
					properties: {
						id: { type: 'string' },
					},
					required: ['id'],
				},
			},
		},
		effectHandler(
			(req: FastifyRequest<{ Params: WebhookParams }>) =>
				Effect.gen(function* () {
					const workspaceId = req.workspace!.id;
					const { id: webhookId } = req.params;

					// Check if webhook exists and belongs to workspace
					const existingWebhook = yield* Effect.tryPromise({
						try: () =>
							db.query.organizationWebhooks.findFirst({
								where: eq(organizationWebhooks.id, webhookId),
							}),
						catch: () => ({
							code: 'DB_ERROR',
							message: 'Failed to fetch webhook',
						}),
					});

					if (!existingWebhook || existingWebhook.organizationId !== workspaceId) {
						return yield* Effect.fail({
							code: 'NOT_FOUND',
							message: 'Webhook not found',
						});
					}

					// Delete the webhook
					yield* Effect.tryPromise({
						try: () =>
							db.delete(organizationWebhooks).where(eq(organizationWebhooks.id, webhookId)),
						catch: (error) => ({
							code: 'DB_ERROR',
							message: 'Failed to delete webhook',
						}),
					});

					return { message: 'Webhook deleted successfully' };
				}),
			{
				onSuccess: (data) => ({
					status: 200,
					body: { success: true, data },
				}),
				onError: (error) => ({
					status: error.code === 'NOT_FOUND' ? 404 : 500,
					body: {
						success: false,
						error: error,
					},
				}),
			},
		),
	);
}
