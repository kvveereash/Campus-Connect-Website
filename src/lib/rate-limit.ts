import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate Limiter Configuration
 * 
 * Uses in-memory storage for development (no Redis required)
 * Can be upgraded to Redis for production by setting UPSTASH_REDIS_REST_URL
 */

// In-memory storage for development
class InMemoryStore {
    private store: Map<string, { count: number; reset: number }> = new Map();

    async get(key: string) {
        const data = this.store.get(key);
        if (!data) return null;

        // Check if expired
        if (Date.now() > data.reset) {
            this.store.delete(key);
            return null;
        }

        return data.count;
    }

    async set(key: string, count: number, ttl: number) {
        this.store.set(key, {
            count,
            reset: Date.now() + ttl * 1000
        });
    }

    async incr(key: string) {
        const current = await this.get(key);
        const newCount = (current || 0) + 1;
        await this.set(key, newCount, 60); // Default 60s TTL
        return newCount;
    }
}

// Create Redis client or use in-memory
const redis = process.env.UPSTASH_REDIS_REST_URL
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
    })
    : (new InMemoryStore() as any);

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

/**
 * Helper function to check rate limit
 * Returns { success: boolean, remaining: number, reset: Date }
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
    const result = await limiter.limit(identifier);

    return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: new Date(result.reset),
    };
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
