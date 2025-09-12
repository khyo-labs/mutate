import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { adminRoutes } from './index.js';

vi.mock('./billing.js', () => ({ adminBillingRoutes: async () => {} }));
vi.mock('./workspaces.js', () => ({ adminWorkspaceRoutes: async () => {} }));
vi.mock('../../middleware/auth.js', () => ({ requireAdmin: vi.fn(async () => {}) }));

describe('adminRoutes', () => {
        it('reports non-admin access when unauthenticated', async () => {
                const app = Fastify();
                app.decorate('authenticate', async () => {});
                await app.register(adminRoutes, { prefix: '/admin' });

                const res = await app.inject({ method: 'GET', url: '/admin/check-access' });
                const body = JSON.parse(res.payload);

                expect(res.statusCode).toBe(200);
                expect(body.data.isAdmin).toBe(false);

                await app.close();
        });
});
