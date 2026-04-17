import { Ratelimit } from '@upstash/ratelimit';
import { redis, checkRedisHealth, isRedisHealthy, isRedisConfiguredFn } from '@/lib/redis';

/**
 * Rate Limiter Configuration
 * 
 * Uses the shared Redis client from redis.ts.
 * Falls back to in-memory when Redis is not configured.
 * 
 * Re-exports health check functions for backward compatibility.
 */

// Re-export health checks (consumers may import from here)
export { checkRedisHealth, isRedisHealthy };

/**
 * Rate Limiters for different actions
 */

// Authentication: 5 attempts per 15 minutes
export const authLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: false,
    prefix: 'ratelimit:auth',
});

// Signup: 3 attempts per hour (prevent spam accounts)
export const signupLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    analytics: false,
    prefix: 'ratelimit:signup',
});

// Messages: 10 per minute (prevent chat spam)
export const messageLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: false,
    prefix: 'ratelimit:message',
});

// Posts: 5 per hour (prevent post spam)
export const postLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    analytics: false,
    prefix: 'ratelimit:post',
});

// Comments: 10 per minute (prevent comment spam)
export const commentLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: false,
    prefix: 'ratelimit:comment',
});

// Events: 3 per hour (prevent event spam)
export const eventLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    analytics: false,
    prefix: 'ratelimit:event',
});

// Global API: 100 requests per minute (DDoS protection)
export const globalApiLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: false,
    prefix: 'ratelimit:api:global',
});

// Sensitive Actions: 10 per hour (profile updates, password changes)
export const sensitiveActionLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    analytics: false,
    prefix: 'ratelimit:sensitive',
});

/**
 * Helper function to check rate limit
 * Returns { success: boolean, remaining: number, reset: Date }
 * Includes graceful fallback if rate limiting fails
 */
export async function checkRateLimit(
    limiter: Ratelimit,
    identifier: string
): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: Date;
}> {
    // If no Redis configured, skip rate limiting in development
    if (!isRedisConfiguredFn() && process.env.NODE_ENV === 'development') {
        return {
            success: true,
            limit: 100,
            remaining: 99,
            reset: new Date(Date.now() + 60000),
        };
    }

    try {
        const result = await limiter.limit(identifier);

        return {
            success: result.success,
            limit: result.limit,
            remaining: result.remaining,
            reset: new Date(result.reset),
        };
    } catch (error) {
        // Log error but don't block the request
        console.error('[RateLimit] Error checking rate limit:', error);

        // Fail open - allow request if rate limiting fails
        return {
            success: true,
            limit: 100,
            remaining: 99,
            reset: new Date(Date.now() + 60000),
        };
    }
}

/**
 * Get identifier for rate limiting
 * Uses IP address or user ID
 */
export function getRateLimitIdentifier(
    userId?: string,
    ip?: string
): string {
    // Prefer user ID for authenticated requests
    if (userId) return `user:${userId}`;

    // Fall back to IP address
    if (ip) return `ip:${ip}`;

    // Default fallback
    return 'anonymous';
}
