import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import { userRoutes } from './user.js';

describe('userRoutes', () => {
	it('requires authentication for /me', async () => {
		const app = Fastify();
		app.decorate('authenticate', async () => {});
		await app.register(userRoutes, { prefix: '/user' });

		const res = await app.inject({ method: 'GET', url: '/user/me' });
		const body = JSON.parse(res.payload);

		expect(res.statusCode).toBe(401);
		expect(body.error.code).toBe('UNAUTHORIZED');

		await app.close();
	});

	it('returns current user when authenticated', async () => {
		const app = Fastify();
		app.decorate('authenticate', async (req) => {
			req.currentUser = { id: '123' } as any;
		});
		await app.register(userRoutes, { prefix: '/user' });

		const res = await app.inject({ method: 'GET', url: '/user/me' });
		const body = JSON.parse(res.payload);

		expect(res.statusCode).toBe(200);
		expect(body.data.id).toBe('123');

		await app.close();
	});
});
