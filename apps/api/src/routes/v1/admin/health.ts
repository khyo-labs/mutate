import { FastifyInstance } from 'fastify';

import { db } from '@/db/connection.js';
import { requireAdmin } from '@/middleware/auth.js';
import { redis, transformationQueue } from '@/services/queue.js';

export async function adminHealthRoutes(fastify: FastifyInstance) {
	fastify.addHook('preHandler', fastify.authenticate);
	fastify.addHook('preHandler', requireAdmin);

	fastify.get('/status', async (request, reply) => {
		const now = new Date().toISOString();

		const time = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

		async function timed<T>(fn: () => Promise<T>): Promise<{ ok: boolean; data?: T; ms: number }> {
			const start = time();
			try {
				const data = await fn();
				const ms = Math.max(0, Math.round(time() - start));
				return { ok: true, data, ms };
			} catch {
				const ms = Math.max(0, Math.round(time() - start));
				return { ok: false, ms };
			}
		}

		const [dbRes, redisRes, queueRes] = await Promise.all([
			timed(() => db.execute('SELECT 1')),
			timed(() => redis.ping()),
			timed(() => transformationQueue.getJobCounts()),
		]);

		const dbUp = dbRes.ok;
		const redisUp = redisRes.ok;
		const queueOk = queueRes.ok;

		const counts = (queueRes.data as any) || {
			waiting: 0,
			active: 0,
			completed: 0,
			failed: 0,
			delayed: 0,
			paused: 0,
		};

		const queueSize = (counts.waiting || 0) + (counts.active || 0) + (counts.delayed || 0);

		const overall = dbUp && redisUp && queueOk ? 'healthy' : 'degraded';

		return {
			success: true,
			data: {
				status: overall,
				services: {
					api: {
						name: 'API',
						status: 'up',
						responseTime: 0,
						lastCheck: now,
						message: 'OK',
					},
					database: {
						name: 'Database',
						status: dbUp ? 'up' : 'down',
						responseTime: dbRes.ms,
						lastCheck: now,
						message: dbUp ? 'Connected' : 'Unavailable',
					},
					redis: {
						name: 'Redis',
						status: redisUp ? 'up' : 'down',
						responseTime: redisRes.ms,
						lastCheck: now,
						message: redisUp ? 'Connected' : 'Unavailable',
					},
					storage: {
						name: 'Storage',
						status: 'degraded',
						responseTime: 0,
						lastCheck: now,
						message: 'Not available',
					},
				},
				metrics: {
					cpuUsage: 0,
					memoryUsage: 0,
					diskUsage: 0,
					activeConnections: 0,
					queueSize,
					errorRate: 0,
				},
				performance: {
					avgResponseTime: Math.round((dbRes.ms + redisRes.ms) / 2),
					p95ResponseTime: 0,
					p99ResponseTime: 0,
					requestsPerSecond: 0,
				},
				alerts: [],
			},
		};
	});

	fastify.get('/metrics', async () => {
		return {
			success: true,
			data: { metrics: [] },
		};
	});

	fastify.post('/alerts/:id/acknowledge', async (request) => {
		const { id } = request.params as { id: string };
		return {
			success: true,
			data: { id, acknowledged: true },
		};
	});
}
