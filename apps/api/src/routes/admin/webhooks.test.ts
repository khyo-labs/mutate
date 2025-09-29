import Fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { adminWebhookRoutes } from './webhooks.js';

const makeSelectChain = (result: unknown[]) => ({
	from: vi.fn().mockReturnThis(),
	where: vi.fn().mockReturnThis(),
	orderBy: vi.fn().mockReturnThis(),
	limit: vi.fn().mockReturnThis(),
	offset: vi.fn().mockResolvedValue(result),
});

vi.mock('../../db/connection.js', () => {
	const selectMock = vi.fn();
	const findFirstMock = vi.fn();
	const db = {
		select: selectMock,
		query: {
			webhookDeliveries: {
				findFirst: findFirstMock,
			},
		},
		update: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		where: vi.fn().mockResolvedValue(undefined),
	} as any;
	return { db, findFirstMock };
});

vi.mock('../../services/queue.js', () => ({
	webhookDeliveryQueue: { add: vi.fn().mockResolvedValue(undefined) },
}));

const { db, findFirstMock } = await import('../../db/connection.js');
const { webhookDeliveryQueue } = await import('../../services/queue.js');

describe('adminWebhookRoutes', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('lists deliveries', async () => {
		(db.select as any).mockReturnValueOnce(makeSelectChain([]));

		const app = Fastify();
		await app.register(adminWebhookRoutes, { prefix: '/admin/webhooks' });

		const res = await app.inject({
			method: 'GET',
			url: '/admin/webhooks/deliveries',
		});
		const body = JSON.parse(res.payload);

		expect(res.statusCode).toBe(200);
		expect(body.success).toBe(true);

		await app.close();
	});

	it('lists dead-letter deliveries', async () => {
		(db.select as any).mockReturnValueOnce(makeSelectChain([]));

		const app = Fastify();
		await app.register(adminWebhookRoutes, { prefix: '/admin/webhooks' });

		const res = await app.inject({
			method: 'GET',
			url: '/admin/webhooks/dead',
		});
		const body = JSON.parse(res.payload);

		expect(res.statusCode).toBe(200);
		expect(body.success).toBe(true);

		await app.close();
	});

	it('retries a delivery', async () => {
		findFirstMock.mockResolvedValueOnce({ id: 'wh_1' });
		(db.update as any).mockReturnThis();
		(db.set as any).mockReturnThis();
		(db.where as any).mockResolvedValueOnce(undefined);

		const app = Fastify();
		await app.register(adminWebhookRoutes, { prefix: '/admin/webhooks' });

		const res = await app.inject({
			method: 'POST',
			url: '/admin/webhooks/retry',
			payload: { deliveryId: 'wh_1' },
		});
		const body = JSON.parse(res.payload);

		expect(res.statusCode).toBe(200);
		expect(body.success).toBe(true);
		expect(webhookDeliveryQueue.add).toHaveBeenCalled();

		await app.close();
	});

	it('returns 404 when retrying missing delivery', async () => {
		findFirstMock.mockResolvedValueOnce(null);

		const app = Fastify();
		await app.register(adminWebhookRoutes, { prefix: '/admin/webhooks' });

		const res = await app.inject({
			method: 'POST',
			url: '/admin/webhooks/retry',
			payload: { deliveryId: 'missing' },
		});
		const body = JSON.parse(res.payload);

		expect(res.statusCode).toBe(404);
		expect(body.success).toBe(false);

		await app.close();
	});
});
