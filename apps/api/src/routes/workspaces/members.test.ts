import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { auth } from '../../lib/auth.js';
import { memberRoutes } from './members.js';

vi.mock('../../middleware/workspace-access.js', () => ({
	validateWorkspaceAccess: vi.fn(async (req) => {
		(req as any).workspace = { id: 'ws1', name: 'WS' };
	}),
}));

vi.mock('../../middleware/workspace-admin.js', () => ({
	validateWorkspaceAdmin: vi.fn(async () => {}),
}));

vi.mock('../../lib/auth.js', () => ({
	auth: {
		api: {
			listMembers: vi.fn().mockResolvedValue({ members: [] }),
			listInvitations: vi.fn().mockResolvedValue([]),
		},
	},
}));

describe('memberRoutes', () => {
	it('lists members and invitations', async () => {
		const app = Fastify();
		app.decorate('authenticate', async () => {});
		await app.register(memberRoutes, { prefix: '/:workspaceId/members' });

		const res = await app.inject({ method: 'GET', url: '/ws1/members' });
		const body = JSON.parse(res.payload);

		expect(res.statusCode).toBe(200);
		expect(body.success).toBe(true);

		await app.close();
	});
});
