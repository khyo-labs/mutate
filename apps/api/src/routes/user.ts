import { FastifyInstance } from 'fastify';

import { updateUserSchema } from '../schemas/user.js';
import { UserService } from '../services/user.js';
import '../types/fastify.js';

export async function userRoutes(fastify: FastifyInstance) {
	fastify.addHook('preHandler', fastify.authenticate);

	fastify.get('/me', async (request, reply) => {
		if (!request.currentUser) {
			return reply.status(401).send({
				success: false,
				error: {
					code: 'UNAUTHORIZED',
					message: 'Unauthorized',
				},
			});
		}

		return reply.send({
			success: true,
			data: request.currentUser,
		});
	});

	fastify.put('/me', async (request, reply) => {
		if (!request.currentUser) {
			return reply.status(401).send({
				success: false,
				error: {
					code: 'UNAUTHORIZED',
					message: 'Unauthorized',
				},
			});
		}

		try {
			const body = updateUserSchema.parse(request.body);

			const updatedUser = await UserService.updateUser(
				request.currentUser.id,
				body,
			);

			return reply.send({
				success: true,
				data: updatedUser,
			});
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({
				success: false,
				error: {
					code: 'UPDATE_USER_FAILED',
					message: 'Failed to update user profile.',
				},
			});
		}
	});
}
