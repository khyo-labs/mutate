import { describe, expect, it } from 'vitest';

import { AppError, getErrorMessage } from './error.js';

describe('getErrorMessage', () => {
        it('returns message from AppError', () => {
                const err = new AppError('CODE', 'app error');
                expect(getErrorMessage(err, 'default')).toBe('app error');
        });

        it('returns string error directly', () => {
                expect(getErrorMessage('string error', 'default')).toBe('string error');
        });

        it('returns message from regular Error', () => {
                const err = new Error('regular error');
                expect(getErrorMessage(err, 'default')).toBe('regular error');
        });

        it('falls back to default message for unknown error types', () => {
                expect(getErrorMessage({} as unknown, 'default')).toBe('default');
        });
});

describe('AppError', () => {
        it('sets name to "AppError" and stores provided code', () => {
                const err = new AppError('ERR_CODE', 'boom');
                expect(err.name).toBe('AppError');
                expect(err.code).toBe('ERR_CODE');
        });
});
