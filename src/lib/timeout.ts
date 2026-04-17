/**
 * Timeout Utility
 * 
 * Provides timeout handling for async operations to prevent
 * hanging requests and improve reliability.
 */

import { logger } from './logger';

/**
 * Wrap a promise with a timeout
 * 
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param operation - Name of the operation (for logging)
 * @returns The result of the promise if it completes in time
 * @throws Error if the operation times out
 * 
 * @example
 * ```typescript
 * const event = await withTimeout(
 *     prisma.event.findUnique({ where: { id } }),
 *     5000,
 *     'Fetch event'
 * );
 * ```
 */
export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation: string
): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            logger.error(`Operation timed out: ${operation}`, undefined, {
                operation,
                timeoutMs,
                type: 'timeout',
            });
            reject(new TimeoutError(`${operation} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    try {
        const result = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timeoutId!);
        return result;
    } catch (error) {
        clearTimeout(timeoutId!);
        throw error;
    }
}

/**
 * Custom Timeout Error class
 */
export class TimeoutError extends Error {
    public readonly isTimeout = true;
    public readonly statusCode = 504; // Gateway Timeout

    constructor(message: string) {
        super(message);
        this.name = 'TimeoutError';
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Retry an operation with exponential backoff
 * 
 * @param fn - Function to retry
 * @param options - Retry options
 * @returns The result of the function if successful
 * 
 * @example
 * ```typescript
 * const result = await withRetry(
 *     () => fetchExternalApi(),
 *     { maxRetries: 3, baseDelayMs: 1000 }
 * );
 * ```
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: {
        maxRetries?: number;
        baseDelayMs?: number;
        maxDelayMs?: number;
        shouldRetry?: (error: Error) => boolean;
    } = {}
): Promise<T> {
    const {
        maxRetries = 3,
        baseDelayMs = 1000,
        maxDelayMs = 10000,
        shouldRetry = () => true,
    } = options;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            // Don't retry on timeout errors or if shouldRetry returns false
            if (error instanceof TimeoutError || !shouldRetry(lastError)) {
                throw error;
            }

            // Don't wait after the last attempt
            if (attempt < maxRetries) {
                const delay = Math.min(
                    baseDelayMs * Math.pow(2, attempt),
                    maxDelayMs
                );

                logger.warn(`Retrying operation`, {
                    attempt: attempt + 1,
                    maxRetries,
                    delayMs: delay,
                    error: lastError.message,
                    type: 'retry',
                });

                await sleep(delay);
            }
        }
    }

    throw lastError;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Default timeouts for common operations
 */
export const TIMEOUTS = {
    DATABASE_QUERY: 5000,      // 5 seconds for DB queries
    DATABASE_TRANSACTION: 10000, // 10 seconds for transactions
    EXTERNAL_API: 15000,      // 15 seconds for external APIs
    FILE_UPLOAD: 30000,       // 30 seconds for file uploads
    STRIPE_API: 20000,        // 20 seconds for Stripe operations
} as const;
