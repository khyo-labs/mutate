import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { apiKeyRoutes } from './api-keys.js';

vi.mock('../../middleware/workspace-access.js', () => ({
        validateWorkspaceAccess: vi.fn(async (req) => {
                (req as any).workspace = { id: 'ws1' };
        }),
}));

vi.mock('../../middleware/auth.js', () => ({
        requireRole: () => vi.fn(async () => {}),
}));

describe('apiKeyRoutes', () => {
        it('validates create payload', async () => {
                const app = Fastify();
                app.decorate('authenticate', async () => {});
                app.decorate('requireVerifiedEmail', async () => {});
                await app.register(apiKeyRoutes, { prefix: '/keys' });

                const res = await app.inject({ method: 'POST', url: '/keys', payload: {} });
                const body = JSON.parse(res.payload);

                expect(res.statusCode).toBe(400);
                expect(body.error.code).toBe('VALIDATION_ERROR');

                await app.close();
        });
});
