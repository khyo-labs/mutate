import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import { securityRoutes } from './security.js';

describe('securityRoutes', () => {
	it('requires authentication to view backup codes', async () => {
		const app = Fastify();
		app.decorate('authenticate', async () => {});
		await app.register(securityRoutes, { prefix: '/security' });

		const res = await app.inject({
			method: 'POST',
			url: '/security/two-factor/view-backup-codes',
		});
		const body = JSON.parse(res.payload);

		expect(res.statusCode).toBe(401);
		expect(body.error.code).toBe('UNAUTHORIZED');

		await app.close();
	});
});
