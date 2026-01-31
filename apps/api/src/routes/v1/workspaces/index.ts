import { APIError } from 'better-auth/api';
import { sql } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';

import { db } from '@/db/connection.js';
import { organization } from '@/db/schema.js';
import { auth } from '@/lib/auth.js';
import { validateWorkspaceAccess } from '@/middleware/workspace-access.js';
import {
	createWorkspaceSchema,
	updateWorkspaceSchema,
} from '@/schemas/workspace.js';
import { deleteWorkspace } from '@/services/workspace.js';
import '@/types/fastify.js';
import { AppError, getErrorMessage } from '@/utils/error.js';

import { apiKeyRoutes } from './api-keys.js';
import { configurationRoutes } from './configuration.js';
import { jobRoutes } from './jobs.js';
import { memberRoutes } from './members.js';
import { webhookRoutes } from './webhooks.js';

export async function workspaceRoutes(fastify: FastifyInstance) {
	fastify.register(configurationRoutes, {
		prefix: '/:workspaceId/configuration',
	});

	fastify.register(apiKeyRoutes, {
		prefix: '/:workspaceId/api-keys',
	});

	fastify.register(webhookRoutes, {
		prefix: '/:workspaceId/webhooks',
	});

	fastify.register(memberRoutes, {
		prefix: '/:workspaceId/members',
	});

	fastify.register(jobRoutes, {
		prefix: '/:workspaceId/jobs',
	});

	fastify.addHook('preHandler', fastify.authenticate);

	fastify.patch(
		'/:workspaceId',
		{ preHandler: [validateWorkspaceAccess] },
		async (request, reply) => {
			try {
				const { workspaceId } = request.params as { workspaceId: string };
				const body = updateWorkspaceSchema.parse(request.body);

				if (!body.name && !body.slug && !body.logo && !body.metadata) {
					return reply.status(400).send({
						success: false,
						error: {
							code: 'NO_WORKSPACE_UPDATES',
							message: 'Please provide at least one field to update.',
						},
					});
				}

				const updates: Record<string, unknown> = {};

				if (body.name) {
					const trimmedName = body.name.trim();
					const currentName = request.workspace?.name || '';

					if (trimmedName.length === 0) {
						return reply.status(400).send({
							success: false,
							error: {
								code: 'INVALID_WORKSPACE_NAME',
								message: 'Workspace name is required.',
							},
						});
					}

					if (trimmedName.toLowerCase() !== currentName.toLowerCase()) {
						const [existing] = await db
							.select({ id: organization.id })
							.from(organization)
							.where(
								sql`LOWER(${organization.name}) = LOWER(${trimmedName}) AND ${organization.id} <> ${workspaceId}`,
							)
							.limit(1);

						if (existing) {
							return reply.status(409).send({
								success: false,
								error: {
									code: 'WORKSPACE_NAME_TAKEN',
									message: 'This workspace name is already in use.',
								},
							});
						}
					}

					updates.name = trimmedName;
				}

				if (body.slug) {
					const trimmedSlug = body.slug.trim();
					const currentSlug = request.workspace?.slug || '';

					if (trimmedSlug.length === 0) {
						return reply.status(400).send({
							success: false,
							error: {
								code: 'INVALID_WORKSPACE_SLUG',
								message: 'Workspace slug is required.',
							},
						});
					}

					if (trimmedSlug !== currentSlug) {
						try {
							const result = await auth.api.checkOrganizationSlug({
								body: { slug: trimmedSlug },
							});

							if (!result.status) {
								return reply.status(409).send({
									success: false,
									error: {
										code: 'WORKSPACE_SLUG_TAKEN',
										message: 'This workspace URL is already taken.',
									},
								});
							}
						} catch (error) {
							if (
								error instanceof APIError &&
								error?.body?.code === 'SLUG_IS_TAKEN'
							) {
								return reply.status(409).send({
									success: false,
									error: {
										code: 'WORKSPACE_SLUG_TAKEN',
										message: 'This workspace URL is already taken.',
									},
								});
							}

							throw error;
						}
					}

					updates.slug = trimmedSlug;
				}

				if (body.logo) {
					updates.logo = body.logo;
				}

				if (body.metadata) {
					updates.metadata = body.metadata;
				}

				const result = await auth.api.updateOrganization({
					body: {
						organizationId: workspaceId,
						data: updates,
					},
					headers: request.headers as any,
				});

				return reply.send({
					success: true,
					data: result,
				});
			} catch (error) {
				fastify.log.error(error);

				if (error instanceof APIError) {
					const statusCode = Number(error.status) || 400;
					return reply.status(statusCode).send({
						success: false,
						error: {
							code: error.body?.code || 'FAILED_TO_UPDATE_WORKSPACE',
							message: getErrorMessage(error, 'Failed to update workspace'),
						},
					});
				}

				return reply.status(500).send({
					success: false,
					error: {
						code: 'FAILED_TO_UPDATE_WORKSPACE',
						message: getErrorMessage(error, 'Failed to update workspace'),
					},
				});
			}
		},
	);

	fastify.delete(
		'/:workspaceId',
		{ preHandler: [validateWorkspaceAccess] },
		async (request, reply) => {
			try {
				const { workspaceId } = request.params as { workspaceId: string };
				const result = await deleteWorkspace(
					workspaceId,
					request.currentUser!.id,
				);
				return reply.send(result);
			} catch (error) {
				fastify.log.error(error);
				if (error instanceof AppError) {
					let statusCode = 500;
					if (error.code === 'FORBIDDEN') {
						statusCode = 403;
					} else if (error.code === 'PRECONDITION_FAILED') {
						statusCode = 412;
					} else if (error.code === 'LAST_WORKSPACE') {
						statusCode = 400;
					}
					return reply.status(statusCode).send({
						success: false,
						error: {
							code: error.code,
							message: error.message,
						},
					});
				}
				return reply.status(500).send({
					success: false,
					error: {
						code: 'FAILED_TO_DELETE_WORKSPACE',
						message: getErrorMessage(error, 'Failed to delete workspace'),
					},
				});
			}
		},
	);

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
				error: {
					code: 'FAILED_TO_LIST_WORKSPACES',
					message: getErrorMessage(error, 'Failed to list workspaces'),
				},
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
				error: {
					code: 'FAILED_TO_CREATE_WORKSPACE',
					message: getErrorMessage(error, 'Failed to create workspace'),
				},
			});
		}
	});

	fastify.post('/name-exists', async (request, reply) => {
		try {
			const { name, workspaceId } = request.body as {
				name?: string;
				workspaceId?: string;
			};

			if (!name || name.trim().length === 0) {
				return reply.status(400).send({
					success: false,
					error: {
						code: 'WORKSPACE_NAME_REQUIRED',
						message: 'Workspace name is required',
					},
				});
			}

			const normalizedName = name.trim();
			const condition = workspaceId
				? sql`LOWER(${organization.name}) = LOWER(${normalizedName}) AND ${organization.id} <> ${workspaceId}`
				: sql`LOWER(${organization.name}) = LOWER(${normalizedName})`;

			const [existing] = await db
				.select({ id: organization.id })
				.from(organization)
				.where(condition)
				.limit(1);

			return reply.send({
				success: true,
				data: { available: !existing },
			});
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({
				success: false,
				error: {
					code: 'FAILED_TO_CHECK_WORKSPACE_NAME',
					message: getErrorMessage(error, 'Failed to check workspace name'),
				},
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

			return reply.send({
				success: true,
				data: result,
			});
		} catch (error) {
			fastify.log.error(error);
			if (error instanceof APIError && error?.body?.code === 'SLUG_IS_TAKEN') {
				return reply.status(200).send({
					success: false,
					error: {
						code: 'SLUG_IS_TAKEN',
						message: 'This workspace URL is already taken',
					},
				});
			}
			return reply.status(400).send({
				success: false,
				error: getErrorMessage(error, 'Failed to check workspace slug'),
			});
		}
	});

	// Set active workspace/organization
	fastify.post('/set-active', async (request, reply) => {
		try {
			const { organizationId } = request.body as { organizationId: string };

			if (!organizationId) {
				return reply.status(400).send({
					success: false,
					error: {
						code: 'ORGANIZATION_ID_REQUIRED',
						message: 'Organization ID is required',
					},
				});
			}

			const result = await auth.api.setActiveOrganization({
				body: {
					organizationId,
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
				error: {
					code: 'FAILED_TO_SET_ACTIVE_WORKSPACE',
					message: getErrorMessage(error, 'Failed to set active workspace'),
				},
			});
		}
	});

	// Note: Webhook routes have been moved to /v1/workspace/:workspaceId/webhooks
}
