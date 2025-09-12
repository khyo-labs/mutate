import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { webhookRoutes } from './webhooks.js';

vi.mock('../../middleware/workspace-access.js', () => ({
        validateWorkspaceAccess: vi.fn(async (req) => {
                (req as any).workspace = { id: 'ws1' };
        }),
}));

vi.mock('../../services/webhook.js', () => ({
        WebhookService: {
                validateWebhookUrl: vi.fn(() => ({ valid: false, error: 'invalid' })),
        },
}));

describe('webhookRoutes', () => {
        it('rejects invalid webhook url', async () => {
                const app = Fastify();
                app.decorate('authenticate', async () => {});
                await app.register(webhookRoutes, { prefix: '/webhooks' });

                const res = await app.inject({
                        method: 'POST',
                        url: '/webhooks',
                        payload: { name: 'wh', url: 'bad', secret: 's' },
                });
                const body = JSON.parse(res.payload);

                expect(res.statusCode).toBe(400);
                expect(body.success).toBe(false);

                await app.close();
        });
});
