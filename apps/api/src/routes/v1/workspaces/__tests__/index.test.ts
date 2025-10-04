import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { auth } from '../../../../lib/auth.js';
import { workspaceRoutes } from '../index.js';

vi.mock('../../../../lib/auth.js', () => ({
	auth: {
		api: {
			listOrganizations: vi.fn(),
			createOrganization: vi.fn(),
			checkOrganizationSlug: vi.fn(),
			updateOrganization: vi.fn(),
			setActiveOrganization: vi.fn(),
		},
	},
}));

describe('workspaceRoutes', () => {
	it('checks slug availability', async () => {
		(auth.api.checkOrganizationSlug as any).mockResolvedValue({ ok: true });
		const app = Fastify();
		app.decorate('authenticate', async () => {});
		await app.register(workspaceRoutes, { prefix: '/workspaces' });

		const res = await app.inject({
			method: 'POST',
			url: '/workspaces/exists',
			payload: { slug: 'test' },
		});
		const body = JSON.parse(res.payload);

		expect(res.statusCode).toBe(200);
		expect(body.success).toBe(true);

		await app.close();
	});
});
