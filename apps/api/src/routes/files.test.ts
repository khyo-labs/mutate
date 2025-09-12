import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { fileRoutes } from './files.js';

vi.mock('fs/promises', () => ({
        access: vi.fn().mockRejectedValue(new Error('missing')),
        readFile: vi.fn(),
}));

describe('fileRoutes', () => {
        it('returns 404 when file is missing', async () => {
                const app = Fastify();
                await app.register(fileRoutes, { prefix: '/files' });

                const res = await app.inject({ method: 'GET', url: '/files/test.txt' });
                const body = JSON.parse(res.payload);

                expect(res.statusCode).toBe(404);
                expect(body.error.code).toBe('FILE_NOT_FOUND');

                await app.close();
        });
});
