import { FastifyInstance } from 'fastify';

import { config } from '../config.js';
import { auth } from '../lib/auth.js';

export async function authRoutes(fastify: FastifyInstance) {
	fastify.post(
		'/resend-verification-email',
		{
			preHandler: [fastify.authenticate],
		},
		async (request, reply) => {
			if (!request.currentUser) {
				return reply.status(401).send({
					success: false,
					error: {
						code: 'UNAUTHORIZED',
						message: 'Unauthorized',
					},
				});
			}

			const session = await auth.api.getSession({
				headers: request.headers as any,
			});

			if (!session?.user) {
				return reply.status(401).send({
					success: false,
					error: {
						code: 'UNAUTHORIZED',
						message: 'Unauthorized',
					},
				});
			}

			if (session.user.emailVerified) {
				return reply.status(400).send({
					success: false,
					error: {
						code: 'EMAIL_ALREADY_VERIFIED',
						message: 'Email already verified',
					},
				});
			}

			try {
				await auth.api.sendVerificationEmail({
					body: {
						email: session.user.email,
						callbackURL: `${config.BASE_URL}`,
					},
					headers: request.headers as Record<string, string>,
				});
				return reply.send({ message: 'Verification email sent.' });
			} catch (error) {
				fastify.log.error(error, 'Failed to send verification email');
				return reply.status(500).send({
					success: false,
					error: {
						code: 'FAILED_TO_SEND_VERIFICATION_EMAIL',
						message: 'Failed to send verification email',
					},
				});
			}
		},
	);

	fastify.all('/*', async (request, reply) => {
		try {
			const cleanPath = request.url || '/';
			const fullUrl = `http://${request.headers.host}${cleanPath}`;

			const headers = new Headers();

			Object.entries(request.headers).forEach(([key, value]: [string, any]) => {
				if (value) {
					const headerValue = Array.isArray(value)
						? value.join(', ')
						: value.toString();
					headers.append(key, headerValue);
				}
			});

			let body: string | undefined;
			if (request.body) {
				body =
					typeof request.body === 'string'
						? request.body
						: JSON.stringify(request.body);
			}

			const req = new Request(fullUrl, {
				method: request.method,
				headers,
				body: body || undefined,
			});

			const response = await auth.handler(req);

			reply.status(response.status);
			response.headers.forEach((value: string, key: string) =>
				reply.header(key, value),
			);

			const responseText = response.body ? await response.text() : null;
			reply.send(responseText);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			fastify.log.error('Authentication Error: %s', message);
			reply.status(500).send({
				error: 'Internal authentication error',
				code: 'AUTH_FAILURE',
			});
		}
	});
}
