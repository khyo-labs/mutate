import { and, count, desc, eq, ilike } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';

import { db } from '../db/connection.js';
import { configurationVersions, configurations } from '../db/schema.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import {
	configurationQuerySchema,
	createConfigurationSchema,
	updateConfigurationSchema,
} from '../schemas/configuration.js';
import '../types/fastify.js';

export async function configurationRoutes(fastify: FastifyInstance) {
	// Add authentication to all routes
	fastify.addHook('preHandler', authenticateJWT);

	// Create configuration
	fastify.post(
		'/',
		{
			preHandler: [requireRole('member')],
		},
		async (request, reply) => {
			// Validate request body
			const validationResult = createConfigurationSchema.safeParse(
				request.body,
			);
			if (!validationResult.success) {
				return reply.code(400).send({
					success: false,
					error: {
						code: 'VALIDATION_ERROR',
						message: 'Invalid request data',
						details: validationResult.error.errors.reduce(
							(acc, err) => {
								const field = err.path.join('.');
								acc[field] = err.message;
								return acc;
							},
							{} as Record<string, string>,
						),
					},
				});
			}

			const { name, description, rules, outputFormat } = validationResult.data;

			try {
				const [configuration] = await db
					.insert(configurations)
					.values({
						organizationId: request.currentUser!.organizationId,
						name,
						description,
						rules,
						outputFormat,
						version: 1,
						createdBy: request.currentUser!.id,
					})
					.returning();

				// Create initial version
				await db.insert(configurationVersions).values({
					configurationId: configuration.id,
					version: 1,
					rules,
					outputFormat,
					createdBy: request.currentUser!.id,
				});

				return {
					success: true,
					data: {
						id: configuration.id,
						name: configuration.name,
						description: configuration.description,
						rules: configuration.rules,
						outputFormat: configuration.outputFormat,
						version: configuration.version,
						createdAt: configuration.createdAt,
					},
				};
			} catch (error) {
				request.log.error('Create configuration error:', error);
				return reply.code(500).send({
					success: false,
					error: {
						code: 'CONFIGURATION_CREATE_FAILED',
						message: 'Failed to create configuration',
					},
				});
			}
		},
	);

	// List configurations
	fastify.get('/', async (request, reply) => {
		// Validate query parameters
		const validationResult = configurationQuerySchema.safeParse(request.query);
		if (!validationResult.success) {
			return reply.code(400).send({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Invalid query parameters',
					details: validationResult.error.errors.reduce(
						(acc, err) => {
							const field = err.path.join('.');
							acc[field] = err.message;
							return acc;
						},
						{} as Record<string, string>,
					),
				},
			});
		}

		const { page, limit, search } = validationResult.data;

		try {
			const offset = (page - 1) * limit;

			let query = db
				.select({
					id: configurations.id,
					name: configurations.name,
					description: configurations.description,
					version: configurations.version,
					isActive: configurations.isActive,
					createdAt: configurations.createdAt,
					updatedAt: configurations.updatedAt,
				})
				.from(configurations)
				.where(
					search
						? and(
								eq(
									configurations.organizationId,
									request.currentUser!.organizationId,
								),
								eq(configurations.isActive, true),
								ilike(configurations.name, `%${search}%`),
							)
						: and(
								eq(
									configurations.organizationId,
									request.currentUser!.organizationId,
								),
								eq(configurations.isActive, true),
							),
				)
				.orderBy(desc(configurations.updatedAt))
				.limit(limit)
				.offset(offset);

			const results = await query;

			// Get total count
			const [totalResult] = await db
				.select({ count: count() })
				.from(configurations)
				.where(
					search
						? and(
								eq(
									configurations.organizationId,
									request.currentUser!.organizationId,
								),
								eq(configurations.isActive, true),
								ilike(configurations.name, `%${search}%`),
							)
						: and(
								eq(
									configurations.organizationId,
									request.currentUser!.organizationId,
								),
								eq(configurations.isActive, true),
							),
				);

			const total = totalResult.count;
			const totalPages = Math.ceil(total / limit);

			return {
				success: true,
				data: results,
				pagination: {
					page,
					limit,
					total,
					totalPages,
				},
			};
		} catch (error) {
			request.log.error('List configurations error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'CONFIGURATION_LIST_FAILED',
					message: 'Failed to list configurations',
				},
			});
		}
	});

	// Get configuration by ID
	fastify.get('/:id', async (request, reply) => {
		const { id } = request.params as { id: string };

		try {
			const [configuration] = await db
				.select()
				.from(configurations)
				.where(
					and(
						eq(configurations.id, id),
						eq(
							configurations.organizationId,
							request.currentUser!.organizationId,
						),
						eq(configurations.isActive, true),
					),
				)
				.limit(1);

			if (!configuration) {
				return reply.code(404).send({
					success: false,
					error: {
						code: 'CONFIGURATION_NOT_FOUND',
						message: 'Configuration not found',
					},
				});
			}

			return {
				success: true,
				data: configuration,
			};
		} catch (error) {
			request.log.error('Get configuration error:', error);
			return reply.code(500).send({
				success: false,
				error: {
					code: 'CONFIGURATION_GET_FAILED',
					message: 'Failed to get configuration',
				},
			});
		}
	});

	// Update configuration
	fastify.put(
		'/:id',
		{
			preHandler: [requireRole('member')],
		},
		async (request, reply) => {
			const { id } = request.params as { id: string };

			// Validate request body
			const validationResult = updateConfigurationSchema.safeParse(
				request.body,
			);
			if (!validationResult.success) {
				return reply.code(400).send({
					success: false,
					error: {
						code: 'VALIDATION_ERROR',
						message: 'Invalid request data',
						details: validationResult.error.errors.reduce(
							(acc, err) => {
								const field = err.path.join('.');
								acc[field] = err.message;
								return acc;
							},
							{} as Record<string, string>,
						),
					},
				});
			}

			const updateData = validationResult.data;

			try {
				// Check if configuration exists and user has access
				const [existingConfig] = await db
					.select()
					.from(configurations)
					.where(
						and(
							eq(configurations.id, id),
							eq(
								configurations.organizationId,
								request.currentUser!.organizationId,
							),
							eq(configurations.isActive, true),
						),
					)
					.limit(1);

				if (!existingConfig) {
					return reply.code(404).send({
						success: false,
						error: {
							code: 'CONFIGURATION_NOT_FOUND',
							message: 'Configuration not found',
						},
					});
				}

				// Update configuration
				const newVersion = existingConfig.version + 1;
				const [updatedConfig] = await db
					.update(configurations)
					.set({
						...updateData,
						version: newVersion,
						updatedAt: new Date(),
					})
					.where(eq(configurations.id, id))
					.returning();

				// Create new version if rules changed
				if (updateData.rules) {
					await db.insert(configurationVersions).values({
						configurationId: id,
						version: newVersion,
						rules: updateData.rules,
						outputFormat:
							updateData.outputFormat || existingConfig.outputFormat,
						createdBy: request.currentUser!.id,
					});
				}

				return {
					success: true,
					data: updatedConfig,
				};
			} catch (error) {
				request.log.error('Update configuration error:', error);
				return reply.code(500).send({
					success: false,
					error: {
						code: 'CONFIGURATION_UPDATE_FAILED',
						message: 'Failed to update configuration',
					},
				});
			}
		},
	);

	// Delete configuration (soft delete)
	fastify.delete(
		'/:id',
		{
			preHandler: [requireRole('member')],
		},
		async (request, reply) => {
			const { id } = request.params as { id: string };

			try {
				const [deletedConfig] = await db
					.update(configurations)
					.set({
						isActive: false,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(configurations.id, id),
							eq(
								configurations.organizationId,
								request.currentUser!.organizationId,
							),
							eq(configurations.isActive, true),
						),
					)
					.returning();

				if (!deletedConfig) {
					return reply.code(404).send({
						success: false,
						error: {
							code: 'CONFIGURATION_NOT_FOUND',
							message: 'Configuration not found',
						},
					});
				}

				return reply.code(204).send();
			} catch (error) {
				request.log.error('Delete configuration error:', error);
				return reply.code(500).send({
					success: false,
					error: {
						code: 'CONFIGURATION_DELETE_FAILED',
						message: 'Failed to delete configuration',
					},
				});
			}
		},
	);

	// Clone configuration
	fastify.post(
		'/:id/clone',
		{
			preHandler: [requireRole('member')],
		},
		async (request, reply) => {
			const { id } = request.params as { id: string };

			try {
				// Get original configuration
				const [originalConfig] = await db
					.select()
					.from(configurations)
					.where(
						and(
							eq(configurations.id, id),
							eq(
								configurations.organizationId,
								request.currentUser!.organizationId,
							),
							eq(configurations.isActive, true),
						),
					)
					.limit(1);

				if (!originalConfig) {
					return reply.code(404).send({
						success: false,
						error: {
							code: 'CONFIGURATION_NOT_FOUND',
							message: 'Configuration not found',
						},
					});
				}

				// Create clone
				const [clonedConfig] = await db
					.insert(configurations)
					.values({
						organizationId: originalConfig.organizationId,
						name: `${originalConfig.name} (Copy)`,
						description: originalConfig.description,
						rules: originalConfig.rules,
						outputFormat: originalConfig.outputFormat,
						version: 1,
						createdBy: request.currentUser!.id,
					})
					.returning();

				// Create initial version for clone
				await db.insert(configurationVersions).values({
					configurationId: clonedConfig.id,
					version: 1,
					rules: originalConfig.rules,
					outputFormat: originalConfig.outputFormat,
					createdBy: request.currentUser!.id,
				});

				return {
					success: true,
					data: clonedConfig,
				};
			} catch (error) {
				request.log.error('Clone configuration error:', error);
				return reply.code(500).send({
					success: false,
					error: {
						code: 'CONFIGURATION_CLONE_FAILED',
						message: 'Failed to clone configuration',
					},
				});
			}
		},
	);
}
