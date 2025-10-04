import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { auth } from '../../../lib/auth.js';
import { betterAuthRoutes } from '../better-auth.js';

vi.mock('../../../lib/auth.js', () => ({
	auth: {
		handler: vi.fn(),
	},
}));

describe('betterAuthRoutes', () => {
	it('forwards response from auth handler', async () => {
		(auth.handler as any).mockResolvedValue(
			new Response('ok', { status: 200 }),
		);

		const app = Fastify();
		await app.register(betterAuthRoutes, { prefix: '/better-auth' });

		const res = await app.inject({ method: 'GET', url: '/better-auth/test' });

		expect(res.statusCode).toBe(200);
		expect(res.payload).toBe('ok');

		await app.close();
	});
});
