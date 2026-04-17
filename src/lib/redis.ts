import { Redis } from '@upstash/redis';

/**
 * Shared Redis Client
 * 
 * Single Redis instance used across the application for:
 * - Rate limiting
 * - Idempotency checks
 * - Caching
 * 
 * Falls back to an in-memory store when UPSTASH_REDIS_REST_URL is not configured.
 */

// ---------- In-Memory Fallback ----------

class InMemoryStore {
    private store: Map<string, { value: string; expiry: number }> = new Map();

    private cleanup() {
        if (this.store.size > 1000) {
            const now = Date.now();
            for (const [k, v] of this.store.entries()) {
                if (v.expiry < now) this.store.delete(k);
            }
        }
    }

    async get<T = string>(key: string): Promise<T | null> {
        const data = this.store.get(key);
        if (!data) return null;
        if (Date.now() > data.expiry) {
            this.store.delete(key);
            return null;
        }
        try {
            return JSON.parse(data.value) as T;
        } catch {
            return data.value as unknown as T;
        }
    }

    async set(key: string, value: string | number, opts?: { ex?: number }) {
        const ttl = opts?.ex ?? 60;
        this.store.set(key, {
            value: String(value),
            expiry: Date.now() + ttl * 1000,
        });
        this.cleanup();
        return 'OK';
    }

    async setex(key: string, ttl: number, value: string) {
        return this.set(key, value, { ex: ttl });
    }

    async incr(key: string) {
        const current = await this.get<number>(key);
        const newVal = (current ?? 0) + 1;
        // Preserve existing TTL or default 60s
        const existing = this.store.get(key);
        const remainingTtl = existing
            ? Math.max(1, Math.ceil((existing.expiry - Date.now()) / 1000))
            : 60;
        await this.set(key, newVal, { ex: remainingTtl });
        return newVal;
    }

    async del(key: string) {
        this.store.delete(key);
        return 1;
    }

    async ping() {
        return 'PONG';
    }
}

// ---------- Client Factory ----------

const isRedisConfigured = !!(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

function createRedisClient(): Redis | InMemoryStore {
    if (isRedisConfigured) {
        return new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL!,
            token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        });
    }

    if (process.env.NODE_ENV === 'development') {
        console.log('[Redis] Using in-memory store (set UPSTASH_REDIS_REST_URL for production)');
    }

    return new InMemoryStore();
}

// Singleton via globalThis to survive hot reloads
declare const globalThis: {
    __redis?: Redis | InMemoryStore;
} & typeof global;

export const redis: Redis = (globalThis.__redis ??= createRedisClient()) as Redis;

if (process.env.NODE_ENV !== 'production') {
    globalThis.__redis = redis;
}

// ---------- Health Check ----------

let redisHealthy = true;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30_000; // 30 seconds

/**
 * Check Redis health with caching to avoid excessive pings
 */
export async function checkRedisHealth(): Promise<boolean> {
    if (!isRedisConfigured) return true;

    if (Date.now() - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
        return redisHealthy;
    }

    try {
        await (redis as Redis).ping();
        redisHealthy = true;
    } catch (error) {
        console.error('[Redis] Health check failed:', error);
        redisHealthy = false;
    }

    lastHealthCheck = Date.now();
    return redisHealthy;
}

/**
 * Get current Redis health status (without triggering a check)
 */
export function isRedisHealthy(): boolean {
    return redisHealthy;
}

/**
 * Whether we're using a real Redis instance
 */
export function isRedisConfiguredFn(): boolean {
    return isRedisConfigured;
}
