import { beforeAll, describe, expect, it, vi } from 'vitest';

let logError: typeof import('./logger.js').logError;

describe('logError', () => {
        beforeAll(async () => {
                process.env.NODE_ENV = 'test';
                process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
                process.env.SENDGRID_API_KEY = 'SG.fake-key';
                process.env.SENDGRID_FROM_EMAIL = 'test@example.com';
                ({ logError } = await import('./logger.js'));
        });

        it('logs Error instances with err property', () => {
                const logger = { error: vi.fn() };
                const err = new Error('boom');
                logError(logger as any, 'failed', err);
                expect(logger.error).toHaveBeenCalledWith({ err }, 'failed');
        });

        it('logs string errors directly', () => {
                const logger = { error: vi.fn() };
                logError(logger as any, 'failed', 'oops');
                expect(logger.error).toHaveBeenCalledWith({ error: 'oops' }, 'failed');
        });

        it('logs non-string errors as stringified', () => {
                const logger = { error: vi.fn() };
                logError(logger as any, 'failed', 123);
                expect(logger.error).toHaveBeenCalledWith({ error: '123' }, 'failed');
        });
});

