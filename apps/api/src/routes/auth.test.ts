import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { auth } from '../lib/auth.js';
import { authRoutes } from './auth.js';

vi.mock('../lib/auth.js', () => ({
	auth: {
		api: {
			getSession: vi.fn(),
			sendVerificationEmail: vi.fn(),
		},
		handler: vi.fn(),
	},
}));

describe('authRoutes', () => {
	it('returns 401 when user is not authenticated', async () => {
		const app = Fastify();
		app.decorate('authenticate', async () => {});
		await app.register(authRoutes, { prefix: '/auth' });

		const res = await app.inject({
			method: 'POST',
			url: '/auth/resend-verification-email',
		});
		const body = JSON.parse(res.payload);

		expect(res.statusCode).toBe(401);
		expect(body).toMatchObject({
			success: false,
			error: { code: 'UNAUTHORIZED' },
		});

		await app.close();
	});
});
