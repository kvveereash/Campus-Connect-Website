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

/* Without Upstash, `redis` is redis.ts's InMemoryStore, which has none of the
   eval/evalsha calls @upstash/ratelimit makes. Every limit() threw, and
   checkRateLimit caught it and allowed the request, so no limiter ever
   limited anything. Each limiter now also records its window here, and
   checkRateLimit enforces that window in memory when Redis is not configured.
   In memory means per server instance: weaker than Redis on a serverless host,
   but a real limit rather than none. */
const WINDOWS = new WeakMap<Ratelimit, { tokens: number; windowMs: number; prefix: string }>();

const DURATION_MS = { m: 60_000, h: 3_600_000 } as const;

function defineLimiter(tokens: number, window: `${number} ${'m' | 'h'}`, prefix: string): Ratelimit {
    const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(tokens, window),
        analytics: false,
        prefix,
    });
    const [amount, unit] = window.split(' ') as [string, 'm' | 'h'];
    WINDOWS.set(limiter, { tokens, windowMs: Number(amount) * DURATION_MS[unit], prefix });
    return limiter;
}

const memoryHits = new Map<string, number[]>();
const MEMORY_KEY_LIMIT = 10_000;

function limitInMemory(limiter: Ratelimit, identifier: string) {
    const config = WINDOWS.get(limiter);
    const now = Date.now();
    if (!config) return { success: true, limit: 0, remaining: 0, reset: new Date(now) };

    const key = `${config.prefix}:${identifier}`;
    const recent = (memoryHits.get(key) ?? []).filter((t) => now - t < config.windowMs);
    const success = recent.length < config.tokens;
    if (success) recent.push(now);

    // Bounded, so a flood of distinct identifiers cannot grow this forever.
    if (!memoryHits.has(key) && memoryHits.size >= MEMORY_KEY_LIMIT) {
        const oldest = memoryHits.keys().next().value;
        if (oldest !== undefined) memoryHits.delete(oldest);
    }
    memoryHits.set(key, recent);

    return {
        success,
        limit: config.tokens,
        remaining: Math.max(0, config.tokens - recent.length),
        reset: new Date((recent[0] ?? now) + config.windowMs),
    };
}

/** Test hook: forget every in-memory hit. */
export function resetInMemoryRateLimits() {
    memoryHits.clear();
}

// Authentication: 5 attempts per 15 minutes
export const authLimiter = defineLimiter(5, '15 m', 'ratelimit:auth');

// Signup: 3 attempts per hour (prevent spam accounts)
export const signupLimiter = defineLimiter(3, '1 h', 'ratelimit:signup');

// Per client IP, alongside the per-address limits above: without these, one
// machine could try a password against every address (one attempt each) or
// create unlimited accounts. Generous, because a campus shares few IPs.
export const loginIpLimiter = defineLimiter(30, '15 m', 'ratelimit:login-ip');
export const signupIpLimiter = defineLimiter(20, '1 h', 'ratelimit:signup-ip');

// Messages: 10 per minute (prevent chat spam)
export const messageLimiter = defineLimiter(10, '1 m', 'ratelimit:message');

// Posts: 5 per hour (prevent post spam)
export const postLimiter = defineLimiter(5, '1 h', 'ratelimit:post');

// Comments: 10 per minute (prevent comment spam)
export const commentLimiter = defineLimiter(10, '1 m', 'ratelimit:comment');

// Events: 3 per hour (prevent event spam)
export const eventLimiter = defineLimiter(3, '1 h', 'ratelimit:event');

// Global API: 100 requests per minute (DDoS protection)
export const globalApiLimiter = defineLimiter(100, '1 m', 'ratelimit:api:global');

// Uploads: 20 per hour (writes to disk — keep it tight)
export const uploadLimiter = defineLimiter(20, '1 h', 'ratelimit:upload');

// Organiser announcements to everyone going: 5 an hour per organiser. Each one
// is a notification (and a push) to every attendee.
export const announceLimiter = defineLimiter(5, '1 h', 'ratelimit:announce');

// Reports for moderation: 10 an hour per user.
export const reportLimiter = defineLimiter(10, '1 h', 'ratelimit:report');

// Club applications: 10 an hour per user.
export const applicationLimiter = defineLimiter(10, '1 h', 'ratelimit:application');

// Push subscriptions saved: 10 an hour per user (one per browser is normal).
export const pushSubscribeLimiter = defineLimiter(10, '1 h', 'ratelimit:push-subscribe');

// "Ask in plain words" search: 20 an hour per IP. Each one is a paid model call.
export const aiSearchLimiter = defineLimiter(20, '1 h', 'ratelimit:ai-search');

// Google sign-in starts: 20 an hour per IP.
export const googleAuthLimiter = defineLimiter(20, '1 h', 'ratelimit:google-auth');

// "Try the demo" sign-ins: 10 an hour per IP. Plenty for a recruiter clicking
// around; not enough to script the demo account into a spam source.
export const demoLimiter = defineLimiter(10, '1 h', 'ratelimit:demo');

// Crash reports from browsers: 20 a minute per IP. Real crashes come one or two
// at a time; more than this is a loop or someone filling the logs.
export const clientErrorLimiter = defineLimiter(20, '1 m', 'ratelimit:client-error');

// Sensitive Actions: 10 per hour (profile updates, password changes)
export const sensitiveActionLimiter = defineLimiter(10, '1 h', 'ratelimit:sensitive');

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

    if (!isRedisConfiguredFn()) {
        return limitInMemory(limiter, identifier);
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

/**
 * The caller's IP, for rate limiting requests that have no user yet.
 *
 * Netlify sets x-nf-client-connection-ip itself, so prefer it; the first
 * x-forwarded-for hop is the fallback elsewhere. Without either, every
 * anonymous request would share one 'anonymous' bucket, and a single client
 * could use it up for everyone.
 */
export async function getClientIp(): Promise<string | undefined> {
    try {
        const { headers } = await import('next/headers');
        const h = await headers();
        return h.get('x-nf-client-connection-ip')
            ?? h.get('x-forwarded-for')?.split(',')[0]?.trim()
            ?? h.get('x-real-ip')
            ?? undefined;
    } catch {
        // Called outside a request (scripts, tests).
        return undefined;
    }
}
