import { APIError } from 'better-auth/api';
import { FastifyInstance } from 'fastify';

import { auth } from '../../lib/auth.js';
import { createWorkspaceSchema } from '../../schemas/workspace.js';
import '../../types/fastify.js';
import { getErrorMessage } from '../../utils/error.js';

export async function workspaceRoutes(fastify: FastifyInstance) {
	fastify.addHook('preHandler', fastify.authenticate);

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

	// Note: Webhook routes have been moved to /v1/workspaces/:workspaceId/webhooks
}
