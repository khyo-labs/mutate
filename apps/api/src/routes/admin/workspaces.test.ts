import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { adminWorkspaceRoutes } from './workspaces.js';

vi.mock('../../middleware/auth.js', () => ({ requireAdmin: vi.fn(async () => {}) }));
vi.mock('../../db/connection.js', () => ({
        db: {
                select: () => ({
                        from: () => ({
                                where: () => ({
                                        limit: () => Promise.resolve([]),
                                }),
                        }),
                }),
        },
}));

describe('adminWorkspaceRoutes', () => {
        it('returns 404 when workspace is missing', async () => {
                const app = Fastify();
                app.decorate('authenticate', async () => {});
                await app.register(adminWorkspaceRoutes, { prefix: '/admin/workspaces' });

                const res = await app.inject({ method: 'GET', url: '/admin/workspaces/123' });
                const body = JSON.parse(res.payload);

                expect(res.statusCode).toBe(404);
                expect(body.error.code).toBe('WORKSPACE_NOT_FOUND');

                await app.close();
        });
});
