import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { mutateRoutes } from '../mutate.js';

vi.mock('../../../services/queue.js', () => ({ QueueService: class {} }));

describe('mutateRoutes', () => {
	it('requires file upload', async () => {
		const app = Fastify();
		app.decorateRequest('file', async () => undefined);
		app.decorate('authenticate', async (req) => {
			req.currentUser = { id: 'user1', organizationId: 'org1' } as any;
		});
		await app.register(mutateRoutes, { prefix: '/mutate' });

		const res = await app.inject({ method: 'POST', url: '/mutate/config123' });
		const body = JSON.parse(res.payload);

		expect(res.statusCode).toBe(400);
		expect(body.error.code).toBe('MISSING_FILE');

		await app.close();
	});
});
