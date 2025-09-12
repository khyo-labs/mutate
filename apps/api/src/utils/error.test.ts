import { describe, it, expect } from 'vitest';

import { AppError, getErrorMessage } from './error.js';

describe('getErrorMessage', () => {
        it('returns message from AppError', () => {
                const err = new AppError('CODE', 'app error');
                expect(getErrorMessage(err, 'default')).toBe('app error');
        });

        it('returns string error directly', () => {
                expect(getErrorMessage('string error', 'default')).toBe('string error');
        });
});
