import { FastifyInstance } from 'fastify';

import { db } from '../db/connection.js';

export async function healthRoutes(fastify: FastifyInstance) {
	fastify.get('/', async (request, reply) => {
		return {
			success: true,
			data: {
				status: 'healthy',
				timestamp: new Date().toISOString(),
				uptime: process.uptime(),
			},
		};
	});

	fastify.get('/db', async (request, reply) => {
		try {
			await db.select();

			return {
				success: true,
				data: {
					status: 'healthy',
					database: 'connected',
					timestamp: new Date().toISOString(),
				},
			};
		} catch (error) {
			reply.code(503);
			return {
				success: false,
				error: {
					code: 'DATABASE_UNAVAILABLE',
					message: 'Database connection failed',
				},
			};
		}
	});
}
