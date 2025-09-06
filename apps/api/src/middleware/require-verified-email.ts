import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

import { auth } from '../lib/auth.js';
import '../types/fastify.js';

export async function requireVerifiedEmail(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (request.currentUser?.role === 'api') {
		return;
	}

	const session = await auth.api.getSession({
		headers: request.headers as any,
	});

	if (!session?.user?.emailVerified) {
		return reply.status(403).send({
			success: false,
			error: {
				code: 'EMAIL_NOT_VERIFIED',
				message: 'Email not verified',
			},
		});
	}
}

export default fp(async (fastify: FastifyInstance) => {
	fastify.decorate('requireVerifiedEmail', requireVerifiedEmail);
});
