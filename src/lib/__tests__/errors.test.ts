import {
    AppError,
    AuthenticationError,
    AuthorizationError,
    ValidationError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    DatabaseError,
    ExternalServiceError,
    ErrorCode,
    ErrorHandler,
} from '../errors';

describe('Error hierarchy', () => {
    // ── Error Classes ──

    describe('AppError (base)', () => {
        it('creates an error with defaults', () => {
            const err = new AppError('test error');
            expect(err.message).toBe('test error');
            expect(err.code).toBe(ErrorCode.INTERNAL_ERROR);
            expect(err.statusCode).toBe(500);
            expect(err.isOperational).toBe(true);
            expect(err).toBeInstanceOf(Error);
            expect(err).toBeInstanceOf(AppError);
        });

        it('accepts custom code and status', () => {
            const err = new AppError('custom', ErrorCode.NOT_FOUND, 404);
            expect(err.code).toBe(ErrorCode.NOT_FOUND);
            expect(err.statusCode).toBe(404);
        });

        it('can hold context data', () => {
            const err = new AppError('ctx', ErrorCode.INTERNAL_ERROR, 500, true, { userId: '123' });
            expect(err.context).toEqual({ userId: '123' });
        });
    });

    describe('AuthenticationError', () => {
        it('has correct defaults', () => {
            const err = new AuthenticationError();
            expect(err.message).toBe('Authentication failed');
            expect(err.code).toBe(ErrorCode.UNAUTHORIZED);
            expect(err.statusCode).toBe(401);
        });

        it('accepts custom message', () => {
            const err = new AuthenticationError('Token expired');
            expect(err.message).toBe('Token expired');
        });
    });

    describe('AuthorizationError', () => {
        it('has correct defaults', () => {
            const err = new AuthorizationError();
            expect(err.message).toBe('Insufficient permissions');
            expect(err.code).toBe(ErrorCode.INSUFFICIENT_PERMISSIONS);
            expect(err.statusCode).toBe(403);
        });
    });

    describe('ValidationError', () => {
        it('has 400 status code', () => {
            const err = new ValidationError('Invalid input');
            expect(err.statusCode).toBe(400);
            expect(err.code).toBe(ErrorCode.VALIDATION_ERROR);
        });
    });

    describe('NotFoundError', () => {
        it('includes resource name in message', () => {
            const err = new NotFoundError('User');
            expect(err.message).toBe('User not found');
            expect(err.statusCode).toBe(404);
        });

        it('defaults to "Resource"', () => {
            const err = new NotFoundError();
            expect(err.message).toBe('Resource not found');
        });
    });

    describe('ConflictError', () => {
        it('has 409 status code', () => {
            const err = new ConflictError('Already registered');
            expect(err.statusCode).toBe(409);
        });
    });

    describe('RateLimitError', () => {
        it('has 429 status code', () => {
            const err = new RateLimitError();
            expect(err.statusCode).toBe(429);
        });

        it('includes reset time in context', () => {
            const resetTime = new Date('2026-01-01T00:00:00Z');
            const err = new RateLimitError('Too fast', resetTime);
            expect(err.context?.resetTime).toBe(resetTime.toISOString());
        });
    });

    describe('DatabaseError', () => {
        it('is non-operational (unexpected)', () => {
            const err = new DatabaseError();
            expect(err.isOperational).toBe(false);
            expect(err.statusCode).toBe(500);
        });
    });

    describe('ExternalServiceError', () => {
        it('includes service name in message', () => {
            const err = new ExternalServiceError('Stripe', 'connection timeout');
            expect(err.message).toBe('Stripe error: connection timeout');
            expect(err.statusCode).toBe(503);
            expect(err.context?.service).toBe('Stripe');
        });
    });

    // ── ErrorHandler ──

    describe('ErrorHandler.handle()', () => {
        it('handles AppError with user-friendly message', () => {
            const err = new NotFoundError('Event');
            const result = ErrorHandler.handle(err, {});
            expect(result.error).toBe('Event not found');
        });

        it('handles generic Error with generic message', () => {
            const err = new Error('some internal detail');
            const result = ErrorHandler.handle(err, {});
            expect(result.error).toBeDefined();
            // Should not expose internal details
            expect(result.error).not.toContain('some internal detail');
        });

        it('handles non-Error objects gracefully', () => {
            const result = ErrorHandler.handle('string error', {});
            expect(result.error).toBeDefined();
        });
    });
});
