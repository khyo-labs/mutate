import Fastify from 'fastify';
import type { Mock } from 'vitest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../db/connection.js', () => ({
        db: { select: vi.fn() },
}));

import { db } from '../db/connection.js';
import { healthRoutes } from './health.js';

describe('healthRoutes', () => {
        it('returns service health status', async () => {
                const app = Fastify();
                await app.register(healthRoutes, { prefix: '/health' });

                const res = await app.inject({ method: 'GET', url: '/health' });
                const body = JSON.parse(res.payload);

                expect(res.statusCode).toBe(200);
                expect(body).toMatchObject({
                        success: true,
                        data: { status: 'healthy' },
                });

                await app.close();
        });

        it('returns database health when connected', async () => {
                (db.select as unknown as Mock).mockResolvedValueOnce([]);

                const app = Fastify();
                await app.register(healthRoutes, { prefix: '/health' });

                const res = await app.inject({ method: 'GET', url: '/health/db' });
                const body = JSON.parse(res.payload);

                expect(res.statusCode).toBe(200);
                expect(body).toMatchObject({
                        success: true,
                        data: { database: 'connected' },
                });

                await app.close();
        });

        it('handles database connection failures', async () => {
                (db.select as unknown as Mock).mockRejectedValueOnce(new Error('fail'));

                const app = Fastify();
                await app.register(healthRoutes, { prefix: '/health' });

                const res = await app.inject({ method: 'GET', url: '/health/db' });
                const body = JSON.parse(res.payload);

                expect(res.statusCode).toBe(503);
                expect(body).toEqual({
                        success: false,
                        error: {
                                code: 'DATABASE_UNAVAILABLE',
                                message: 'Database connection failed',
                        },
                });

                await app.close();
        });
});
