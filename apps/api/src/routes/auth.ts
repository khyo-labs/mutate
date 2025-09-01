import { FastifyInstance } from 'fastify';

import { auth } from '../lib/auth.js';

export async function authRoutes(fastify: FastifyInstance) {
	fastify.post(
		'/resend-verification-email',
		{
			preHandler: [fastify.authenticate],
		},
		async (request, reply) => {
			const user = request.user;
			if (!user) {
				return reply.status(401).send({ message: 'Unauthorized' });
			}

			if (user.emailVerified) {
				return reply.status(400).send({ message: 'Email already verified' });
			}

			try {
				await auth.api.sendVerificationEmail({
					body: {
						email: user.email,
					},
					headers: request.headers as Record<string, string>,
				});
				return reply.send({ message: 'Verification email sent.' });
			} catch (error) {
				fastify.log.error(error, 'Failed to send verification email');
				return reply
					.status(500)
					.send({ message: 'Failed to send verification email' });
			}
		},
	);
}
