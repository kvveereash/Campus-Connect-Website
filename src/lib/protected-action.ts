

import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { AuthenticationError, AuthorizationError, ErrorHandler } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { Ratelimit } from '@upstash/ratelimit';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';
import { audit, AuditAction, AuditEntityType } from '@/lib/audit';
import { ApiResult, ok, fail, ApiErrorCode } from '@/lib/api-response';

/**
 * Session type returned from getSession with user data
 */
export interface AuthSession {
    userId: string;
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
        avatar: string | null;
    };
    expires?: string;
}

/**
 * Options for protected actions
 */
export interface ProtectedActionOptions {
    /** Require the user to have ADMIN role */
    requireAdmin?: boolean;
    /** Custom role check */
    requiredRoles?: string[];
    /** Rate limiter to apply */
    rateLimiter?: Ratelimit;
    /** 
     * Enable CSRF validation for this action.
     * Recommended for state-changing operations (create, update, delete).
     */
    validateCsrf?: boolean;
    /** 
     * Audit logging configuration.
     * If provided, successful and failed attempts will be logged.
     */
    audit?: {
        action: AuditAction | ((validatedData: any) => AuditAction);
        entityType: AuditEntityType | ((validatedData: any) => AuditEntityType);
        /** Function to extract entity ID from the input data */
        getEntityId?: (input: any) => string;
    };
}

/**
 * Create a protected server action that enforces authentication.
 * 
 * This is THE single action wrapper for all server actions. It combines:
 * - ✅ Authentication check
 * - ✅ Role-based authorization (optional)
 * - ✅ Zod schema validation
 * - ✅ Rate limiting (optional)
 * - ✅ Audit logging (optional)
 * - ✅ Structured error handling & logging
 * - ✅ Performance monitoring (slow action detection)
 * 
 * Returns `ApiResult<T>` — the standard discriminated union response type.
 * 
 * @example
 * ```typescript
 * // Basic protected action
 * export const createEvent = createProtectedAction(
 *     eventSchema,
 *     async (data, session) => {
 *         const event = await prisma.event.create({ ... });
 *         return { eventId: event.id };
 *     },
 *     { rateLimiter: eventLimiter }
 * );
 * 
 * // Admin-only action with audit
 * export const deleteUser = createProtectedAction(
 *     z.object({ userId: z.string() }),
 *     async (data, session) => {
 *         await prisma.user.delete({ where: { id: data.userId } });
 *         return null;
 *     },
 *     {
 *         requireAdmin: true,
 *         audit: { action: 'DELETE', entityType: 'User', getEntityId: (d) => d.userId },
 *     }
 * );
 * ```
 */
export function createProtectedAction<TInput, TOutput>(
    schema: z.Schema<TInput>,
    handler: (validatedData: TInput, session: AuthSession) => Promise<TOutput>,
    options: ProtectedActionOptions = {}
) {
    return async (input: TInput): Promise<ApiResult<TOutput>> => {
        const startTime = Date.now();

        try {
            // 1. Authentication Check
            const session = await getSession();

            if (!session || !session.userId) {
                throw new AuthenticationError('Please log in to continue');
            }

            const authSession: AuthSession = {
                userId: session.userId as string,
                user: session.user as AuthSession['user'],
                expires: session.expires,
            };

            // 2. Authorization Check
            if (options.requireAdmin && authSession.user.role !== 'ADMIN') {
                logger.warn('Unauthorized admin action attempt', {
                    userId: authSession.userId,
                });
                throw new AuthorizationError('Admin access required');
            }

            if (options.requiredRoles && options.requiredRoles.length > 0) {
                if (!options.requiredRoles.includes(authSession.user.role)) {
                    logger.warn('Unauthorized role action attempt', {
                        userId: authSession.userId,
                        requiredRoles: options.requiredRoles,
                        actualRole: authSession.user.role,
                    });
                    throw new AuthorizationError(
                        `Required role: ${options.requiredRoles.join(' or ')}`
                    );
                }
            }

            // 3. Rate Limiting
            if (options.rateLimiter) {
                const identifier = getRateLimitIdentifier(authSession.userId);
                const rateLimitResult = await checkRateLimit(options.rateLimiter, identifier);

                if (!rateLimitResult.success) {
                    logger.rateLimit('action', identifier, true);
                    const resetTime = rateLimitResult.reset.toLocaleTimeString();
                    return fail(
                        `Too many requests. Please try again at ${resetTime}.`,
                        'RATE_LIMITED'
                    );
                }
            }

            // 4. Input Validation
            const validationResult = schema.safeParse(input);

            if (!validationResult.success) {
                const fieldErrors = validationResult.error.flatten().fieldErrors;
                const firstError = Object.values(fieldErrors).flat()[0] || 'Validation failed';
                return fail(firstError as string, 'VALIDATION_ERROR');
            }

            // 5. Execute Handler
            const result = await handler(validationResult.data, authSession);

            // 6. Audit Log (non-blocking)
            if (options.audit) {
                const entityId = options.audit.getEntityId
                    ? options.audit.getEntityId(validationResult.data)
                    : 'unknown';

                const action = typeof options.audit.action === 'function'
                    ? options.audit.action(validationResult.data)
                    : options.audit.action;

                const entityType = typeof options.audit.entityType === 'function'
                    ? options.audit.entityType(validationResult.data)
                    : options.audit.entityType;

                audit(
                    authSession.userId,
                    action,
                    entityType,
                    entityId,
                    { input: validationResult.data }
                ).catch((err) => logger.error('Audit log failed', err as Error));
            }

            // 7. Performance monitoring
            const duration = Date.now() - startTime;
            if (duration > 1000) {
                logger.warn('Slow action detected', {
                    duration,
                    userId: authSession.userId,
                });
            }

            return ok(result);

        } catch (error) {
            // Handle known error types
            if (error instanceof AuthenticationError) {
                return fail(error.message, 'UNAUTHORIZED');
            }

            if (error instanceof AuthorizationError) {
                return fail(error.message, 'FORBIDDEN');
            }

            // Log and handle unexpected errors
            const errorResponse = ErrorHandler.handle(error, {});

            return fail(
                errorResponse.error || 'An unexpected error occurred',
                'INTERNAL_ERROR'
            );
        }
    };
}

/**
 * Create a public action (no auth required) with validation only.
 * Use for actions like search, public data fetching, etc.
 */
export function createPublicAction<TInput, TOutput>(
    schema: z.Schema<TInput>,
    handler: (validatedData: TInput) => Promise<TOutput>,
    options: { rateLimiter?: Ratelimit } = {}
) {
    return async (input: TInput): Promise<ApiResult<TOutput>> => {
        try {
            // 1. Rate Limiting
            if (options.rateLimiter) {
                const identifier = getRateLimitIdentifier(undefined, 'public');
                const rateLimitResult = await checkRateLimit(options.rateLimiter, identifier);

                if (!rateLimitResult.success) {
                    return fail('Too many requests. Please try again later.', 'RATE_LIMITED');
                }
            }

            // 2. Input Validation
            const validationResult = schema.safeParse(input);
            if (!validationResult.success) {
                const firstError = Object.values(
                    validationResult.error.flatten().fieldErrors
                ).flat()[0] || 'Validation failed';
                return fail(firstError as string, 'VALIDATION_ERROR');
            }

            // 3. Execute Handler
            const result = await handler(validationResult.data);
            return ok(result);

        } catch (error) {
            const errorResponse = ErrorHandler.handle(error, {});
            return fail(
                errorResponse.error || 'An unexpected error occurred',
                'INTERNAL_ERROR'
            );
        }
    };
}

/**
 * Require authentication helper for non-action contexts
 * Throws AuthenticationError if not authenticated
 */
export async function requireAuth(): Promise<AuthSession> {
    const session = await getSession();

    if (!session || !session.userId) {
        throw new AuthenticationError('Please log in to continue');
    }

    return {
        userId: session.userId as string,
        user: session.user as AuthSession['user'],
        expires: session.expires,
    };
}

/**
 * Require admin role helper
 * Throws AuthorizationError if not admin
 */
export async function requireAdmin(): Promise<AuthSession> {
    const session = await requireAuth();

    if (session.user.role !== 'ADMIN') {
        throw new AuthorizationError('Admin access required');
    }

    return session;
}

/**
 * Check if current user owns a resource
 * Useful for edit/delete operations
 */
export async function requireOwnership(
    resourceOwnerId: string,
    errorMessage = 'You do not have permission to modify this resource'
): Promise<AuthSession> {
    const session = await requireAuth();

    if (session.userId !== resourceOwnerId && session.user.role !== 'ADMIN') {
        throw new AuthorizationError(errorMessage);
    }

    return session;
}
