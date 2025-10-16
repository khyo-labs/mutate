import type { FastifyInstance } from 'fastify';

import { listFormats } from '@/converters/index.js';

export async function formatsRoutes(app: FastifyInstance) {
	app.get('/', async (_request, reply) => {
		const formats = listFormats();

		return reply.code(200).send({
			success: true,
			count: formats.length,
			formats,
		});
	});
}
