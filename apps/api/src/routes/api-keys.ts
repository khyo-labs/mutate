import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';
import { ulid } from 'ulid';
import { z } from 'zod';

import { db } from '../db/connection.js';
import { apiKeys } from '../db/schema.js';
import { requireRole } from '../middleware/auth.js';
import '../types/fastify.js';
import { logError } from '../utils/logger.js';

const createApiKeySchema = z.object({
	name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
	permissions: z.array(z.string()).optional().default(['transform']),
	expiresAt: z
		.string()
		.optional()
		.transform((val) => (val ? new Date(val) : null)),
});

const updateApiKeySchema = z.object({
	name: z
		.string()
		.min(1, 'Name is required')
		.max(255, 'Name too long')
		.optional(),
	permissions: z.array(z.string()).optional(),
	expiresAt: z
		.string()
		.optional()
		.transform((val) => (val ? new Date(val) : null)),
});

function generateApiKey(): string {
	const randomBytes = crypto.getRandomValues(new Uint8Array(32));
	const key = Array.from(randomBytes, (byte) =>
		byte.toString(16).padStart(2, '0'),
	).join('');
	return `mt_${key}`;
}

export async function apiKeyRoutes(fastify: FastifyInstance) {
	fastify.addHook('preHandler', async (request, reply) => {
		await fastify.authenticate(request, reply);
		await fastify.requireVerifiedEmail(request, reply);
	});

	fastify.get('/', async (request, reply) => {
		try {
			const keys = await db
				.select({
					id: apiKeys.id,
					name: apiKeys.name,
					permissions: apiKeys.permissions,
					lastUsedAt: apiKeys.lastUsedAt,
					createdAt: apiKeys.createdAt,
					expiresAt: apiKeys.expiresAt,
				})
				.from(apiKeys)
				.where(eq(apiKeys.organizationId, request.currentUser!.organizationId))
				.orderBy(apiKeys.createdAt);

			return {
				success: true,
				data: keys,
			};
		} catch (error) {
			logError(request.log, 'List API keys error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'API_KEYS_LIST_FAILED',
					message: 'Failed to list API keys',
				},
			});
		}
	});

	fastify.post(
		'/',
		{
			preHandler: [requireRole('owner')],
		},
		async (request, reply) => {
			const validationResult = createApiKeySchema.safeParse(request.body);
			if (!validationResult.success) {
				return reply.code(400).send({
					success: false,
					error: {
						code: 'VALIDATION_ERROR',
						message: 'Invalid request data',
						details: validationResult.error.issues.reduce(
							(acc: Record<string, string>, err: any) => {
								const field = err.path.join('.');
								acc[field] = err.message;
								return acc;
							},
							{} as Record<string, string>,
						),
					},
				});
			}

			const { name, permissions, expiresAt } = validationResult.data;

			try {
				const apiKey = generateApiKey();
				const keyHash = await bcrypt.hash(apiKey, 10);

				const [newApiKey] = await db
					.insert(apiKeys)
					.values({
						id: ulid(),
						organizationId: request.currentUser!.organizationId,
						keyHash,
						name,
						permissions,
						expiresAt,
						createdBy: request.currentUser!.id,
					})
					.returning({
						id: apiKeys.id,
						name: apiKeys.name,
						permissions: apiKeys.permissions,
						createdAt: apiKeys.createdAt,
						expiresAt: apiKeys.expiresAt,
					});

				return {
					success: true,
					data: {
						...newApiKey,
						apiKey,
					},
				};
			} catch (error) {
				logError(request.log, 'Create API key error:', error);
				return reply.code(500).send({
					success: false,
					error: {
						code: 'API_KEY_CREATE_FAILED',
						message: 'Failed to create API key',
					},
				});
			}
		},
	);

	fastify.put(
		'/:id',
		{
			preHandler: [requireRole('owner')],
		},
		async (request, reply) => {
			const { id } = request.params as { id: string };

			const validationResult = updateApiKeySchema.safeParse(request.body);
			if (!validationResult.success) {
				return reply.code(400).send({
					success: false,
					error: {
						code: 'VALIDATION_ERROR',
						message: 'Invalid request data',
						details: validationResult.error.issues.reduce(
							(acc: Record<string, string>, err: any) => {
								const field = err.path.join('.');
								acc[field] = err.message;
								return acc;
							},
							{} as Record<string, string>,
						),
					},
				});
			}

			try {
				const [updatedKey] = await db
					.update(apiKeys)
					.set(validationResult.data)
					.where(
						eq(apiKeys.id, id) &&
							eq(apiKeys.organizationId, request.currentUser!.organizationId),
					)
					.returning({
						id: apiKeys.id,
						name: apiKeys.name,
						permissions: apiKeys.permissions,
						lastUsedAt: apiKeys.lastUsedAt,
						createdAt: apiKeys.createdAt,
						expiresAt: apiKeys.expiresAt,
					});

				if (!updatedKey) {
					return reply.code(404).send({
						success: false,
						error: {
							code: 'API_KEY_NOT_FOUND',
							message: 'API key not found',
						},
					});
				}

				return {
					success: true,
					data: updatedKey,
				};
			} catch (error) {
				logError(request.log, 'Update API key error:', error);
				return reply.code(500).send({
					success: false,
					error: {
						code: 'API_KEY_UPDATE_FAILED',
						message: 'Failed to update API key',
					},
				});
			}
		},
	);

	fastify.delete(
		'/:id',
		{
			preHandler: [requireRole('owner')],
		},
		async (request, reply) => {
			const { id } = request.params as { id: string };

			try {
				const [deletedKey] = await db
					.delete(apiKeys)
					.where(
						eq(apiKeys.id, id) &&
							eq(apiKeys.organizationId, request.currentUser!.organizationId),
					)
					.returning({ id: apiKeys.id });

				if (!deletedKey) {
					return reply.code(404).send({
						success: false,
						error: {
							code: 'API_KEY_NOT_FOUND',
							message: 'API key not found',
						},
					});
				}

				return reply.code(204).send();
			} catch (error) {
				logError(request.log, 'Delete API key error:', error);
				return reply.code(500).send({
					success: false,
					error: {
						code: 'API_KEY_DELETE_FAILED',
						message: 'Failed to delete API key',
					},
				});
			}
		},
	);
}
