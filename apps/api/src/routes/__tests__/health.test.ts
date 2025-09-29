import Fastify from 'fastify';
import type { Mock } from 'vitest';
import { describe, expect, it, vi } from 'vitest';

import { db } from '../../db/connection.js';
import { healthRoutes } from '../health.js';

vi.mock('../../db/connection.js', () => ({
	db: { select: vi.fn() },
}));

vi.mock('../../services/queue.js', () => ({
	redis: { ping: vi.fn().mockResolvedValue('PONG') },
	transformationQueue: {
		getJobCounts: vi.fn().mockResolvedValue({
			waiting: 0,
			active: 0,
			completed: 0,
			failed: 0,
			delayed: 0,
			paused: 0,
		}),
	},
}));

describe('healthRoutes', () => {
	it('returns service health status', async () => {
		const app = Fastify();
		await app.register(healthRoutes, { prefix: '/health' });

		const res = await app.inject({ method: 'GET', url: '/health' });
		const body = JSON.parse(res.payload);

		expect(res.statusCode).toBe(200);
		expect(body).toMatchObject({
			success: true,
			data: { status: 'healthy' },
		});

		await app.close();
	});

	it('returns database health when connected', async () => {
		(db.select as unknown as Mock).mockResolvedValueOnce([]);

		const app = Fastify();
		await app.register(healthRoutes, { prefix: '/health' });

		const res = await app.inject({ method: 'GET', url: '/health/db' });
		const body = JSON.parse(res.payload);

		expect(res.statusCode).toBe(200);
		expect(body).toMatchObject({
			success: true,
			data: { database: 'connected' },
		});

		await app.close();
	});

	it('handles database connection failures', async () => {
		(db.select as unknown as Mock).mockRejectedValueOnce(new Error('fail'));

		const app = Fastify();
		await app.register(healthRoutes, { prefix: '/health' });

		const res = await app.inject({ method: 'GET', url: '/health/db' });
		const body = JSON.parse(res.payload);

		expect(res.statusCode).toBe(503);
		expect(body).toEqual({
			success: false,
			error: {
				code: 'DATABASE_UNAVAILABLE',
				message: 'Database connection failed',
			},
		});

		await app.close();
	});

	it('returns redis health when connected', async () => {
		const app = Fastify();
		await app.register(healthRoutes, { prefix: '/health' });

		const res = await app.inject({ method: 'GET', url: '/health/redis' });
		const body = JSON.parse(res.payload);

		expect(res.statusCode).toBe(200);
		expect(body).toMatchObject({
			success: true,
			data: { redis: 'connected', status: 'healthy' },
		});

		await app.close();
	});

	it('handles redis connection failures', async () => {
		const { redis } = await import('../../services/queue.js');
		(redis.ping as unknown as Mock).mockRejectedValueOnce(
			new Error('redis down'),
		);

		const app = Fastify();
		await app.register(healthRoutes, { prefix: '/health' });

		const res = await app.inject({ method: 'GET', url: '/health/redis' });
		const body = JSON.parse(res.payload);

		expect(res.statusCode).toBe(503);
		expect(body).toEqual({
			success: false,
			error: {
				code: 'REDIS_UNAVAILABLE',
				message: 'Redis connection failed',
			},
		});

		await app.close();
	});

	it('returns queue health status', async () => {
		const counts = {
			waiting: 2,
			active: 1,
			completed: 5,
			failed: 0,
			delayed: 0,
			paused: 0,
		};
		const { transformationQueue } = await import('../../services/queue.js');
		(transformationQueue.getJobCounts as unknown as Mock).mockResolvedValueOnce(
			counts,
		);

		const app = Fastify();
		await app.register(healthRoutes, { prefix: '/health' });

		const res = await app.inject({ method: 'GET', url: '/health/queue' });
		const body = JSON.parse(res.payload);

		expect(res.statusCode).toBe(200);
		expect(body).toMatchObject({
			success: true,
			data: {
				queue: 'operational',
				counts,
				status: 'healthy',
			},
		});

		await app.close();
	});

	it('handles queue failures', async () => {
		const { transformationQueue } = await import('../../services/queue.js');
		(transformationQueue.getJobCounts as unknown as Mock).mockRejectedValueOnce(
			new Error('queue error'),
		);

		const app = Fastify();
		await app.register(healthRoutes, { prefix: '/health' });

		const res = await app.inject({ method: 'GET', url: '/health/queue' });
		const body = JSON.parse(res.payload);

		expect(res.statusCode).toBe(503);
		expect(body).toEqual({
			success: false,
			error: {
				code: 'QUEUE_UNAVAILABLE',
				message: 'Queue is unavailable',
			},
		});

		await app.close();
	});
});
