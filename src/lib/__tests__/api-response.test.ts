import { ok, okMessage, fail, isOk, isFail, unwrap, tryCatch, ApiResult } from '../api-response';

describe('api-response utilities', () => {
    // ── ok() ──

    describe('ok()', () => {
        it('returns a success result with data', () => {
            const result = ok({ id: '1', name: 'Test' });
            expect(result.success).toBe(true);
            expect(result).toHaveProperty('data', { id: '1', name: 'Test' });
        });

        it('includes an optional message', () => {
            const result = ok(42, 'Created successfully');
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toBe(42);
                expect(result.message).toBe('Created successfully');
            }
        });

        it('handles null data', () => {
            const result = ok(null);
            expect(result.success).toBe(true);
            if (result.success) expect(result.data).toBeNull();
        });
    });

    // ── okMessage() ──

    describe('okMessage()', () => {
        it('returns success with null data and a message', () => {
            const result = okMessage('Deletion complete');
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toBeNull();
                expect(result.message).toBe('Deletion complete');
            }
        });
    });

    // ── fail() ──

    describe('fail()', () => {
        it('returns a failure result with error message', () => {
            const result = fail('Something went wrong');
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe('Something went wrong');
            }
        });

        it('includes an optional error code', () => {
            const result = fail('Not authorized', 'UNAUTHORIZED');
            if (!result.success) {
                expect(result.code).toBe('UNAUTHORIZED');
            }
        });
    });

    // ── isOk() / isFail() ──

    describe('type guards', () => {
        it('isOk returns true for success results', () => {
            const result = ok('hello');
            expect(isOk(result)).toBe(true);
            expect(isFail(result)).toBe(false);
        });

        it('isFail returns true for failure results', () => {
            const result = fail('error');
            expect(isFail(result)).toBe(true);
            expect(isOk(result)).toBe(false);
        });
    });

    // ── unwrap() ──

    describe('unwrap()', () => {
        it('returns data from a success result', () => {
            const result = ok({ count: 5 });
            expect(unwrap(result)).toEqual({ count: 5 });
        });

        it('throws on a failure result', () => {
            const result = fail('Not found');
            expect(() => unwrap(result as ApiResult<any>)).toThrow('Not found');
        });
    });

    // ── tryCatch() ──

    describe('tryCatch()', () => {
        it('wraps a successful async operation', async () => {
            const result = await tryCatch(async () => 'value');
            expect(isOk(result)).toBe(true);
            if (isOk(result)) expect(result.data).toBe('value');
        });

        it('catches thrown errors and returns fail', async () => {
            const result = await tryCatch(async () => {
                throw new Error('DB connection failed');
            });
            expect(isFail(result)).toBe(true);
            if (isFail(result)) {
                expect(result.error).toBe('DB connection failed');
                expect(result.code).toBe('INTERNAL_ERROR');
            }
        });

        it('uses custom error message for non-Error throws', async () => {
            const result = await tryCatch(
                async () => { throw 'string error'; },
                'Custom fallback'
            );
            // The implementation uses error instanceof Error check
            if (isFail(result)) {
                expect(result.error).toBe('Custom fallback');
            }
        });
    });
});
