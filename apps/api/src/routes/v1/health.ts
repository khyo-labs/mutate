import { FastifyInstance } from 'fastify';

import { db } from '@/db/connection.js';
import { redis, transformationQueue } from '@/services/queue.js';

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

	// Redis health
	fastify.get('/redis', async (request, reply) => {
		try {
			const pong = await redis.ping();
			return {
				success: true,
				data: {
					status: 'healthy',
					redis: 'connected',
					pong,
					timestamp: new Date().toISOString(),
				},
			};
		} catch (error) {
			reply.code(503);
			return {
				success: false,
				error: {
					code: 'REDIS_UNAVAILABLE',
					message: 'Redis connection failed',
				},
			};
		}
	});

	// Queue health
	fastify.get('/queue', async (request, reply) => {
		try {
			const counts = await transformationQueue.getJobCounts();
			return {
				success: true,
				data: {
					status: 'healthy',
					queue: 'operational',
					counts,
					timestamp: new Date().toISOString(),
				},
			};
		} catch (error) {
			reply.code(503);
			return {
				success: false,
				error: {
					code: 'QUEUE_UNAVAILABLE',
					message: 'Queue is unavailable',
				},
			};
		}
	});
}
