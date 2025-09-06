import { FastifyInstance } from 'fastify';

import { auth } from '../lib/auth.js';

export async function betterAuthRoutes(fastify: FastifyInstance) {
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
