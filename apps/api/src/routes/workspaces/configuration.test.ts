import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { configRoutes } from './configuration.js';

vi.mock('../../middleware/workspace-access.js', () => ({
        validateWorkspaceAccess: vi.fn(async (req) => {
                (req as any).workspace = { id: 'ws1' };
        }),
}));

vi.mock('../../middleware/auth.js', () => ({
        requireRole: () => vi.fn(async () => {}),
}));

describe('configRoutes', () => {
        it('validates create request', async () => {
                const app = Fastify();
                app.decorate('authenticate', async () => {});
                await app.register(configRoutes, { prefix: '/config' });

                const res = await app.inject({ method: 'POST', url: '/config', payload: {} });
                const body = JSON.parse(res.payload);

                expect(res.statusCode).toBe(400);
                expect(body.error.code).toBe('VALIDATION_ERROR');

                await app.close();
        });
});
