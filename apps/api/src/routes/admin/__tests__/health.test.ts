import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { adminHealthRoutes } from '../health.js';

vi.mock('../../../middleware/auth.js', () => ({
	requireAdmin: vi.fn(async () => {}),
}));

vi.mock('../../../db/connection.js', () => ({
	db: { select: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../../../services/queue.js', () => ({
	redis: { ping: vi.fn().mockResolvedValue('PONG') },
	transformationQueue: {
		getJobCounts: vi.fn().mockResolvedValue({
			waiting: 1,
			active: 1,
			completed: 10,
			failed: 0,
			delayed: 0,
			paused: 0,
		}),
	},
}));

describe('adminHealthRoutes', () => {
	it('returns aggregated health status', async () => {
		const app = Fastify();

		// Minimal auth bypass for tests
		app.decorate('authenticate', async () => {});

		await app.register(adminHealthRoutes, { prefix: '/admin/health' });

		const res = await app.inject({
			method: 'GET',
			url: '/admin/health/status',
		});
		const body = JSON.parse(res.payload);

		expect(res.statusCode).toBe(200);
		expect(body.success).toBe(true);
		expect(
			body.data.status === 'healthy' || body.data.status === 'degraded',
		).toBe(true);
		expect(body.data.services.database.status).toBe('up');
		expect(body.data.services.redis.status).toBe('up');
		expect(typeof body.data.metrics.queueSize).toBe('number');

		await app.close();
	});

	it('acknowledges an alert', async () => {
		const app = Fastify();
		app.decorate('authenticate', async () => {});
		app.decorate('requireAdmin', async () => {});
		app.addHook('preHandler', app.authenticate as any);

		await app.register(adminHealthRoutes, { prefix: '/admin/health' });

		const res = await app.inject({
			method: 'POST',
			url: '/admin/health/alerts/test/acknowledge',
		});
		const body = JSON.parse(res.payload);

		expect(res.statusCode).toBe(200);
		expect(body.success).toBe(true);
		expect(body.data).toMatchObject({ id: 'test', acknowledged: true });

		await app.close();
	});
});
