import { FastifyInstance } from 'fastify';

import { auth } from '../lib/auth.js';
import { authenticateSession } from '../middleware/auth.js';
import { createOrganizationSchema } from '../schemas/organization';
import { getErrorMessage } from '../utils/error';

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
}
