import { redis, isRedisConfiguredFn } from '@/lib/redis';

/**
 * Idempotency Utility
 * 
 * Ensures that a specific operation is performed only once for a given key.
 * Useful for preventing duplicate payments, double-posting, etc.
 * 
 * Uses the shared Redis client from redis.ts.
 */
export async function withIdempotency<T>(
    key: string,
    operation: () => Promise<T>,
    ttlSeconds: number = 3600 // Default 1 hour
): Promise<T> {
    const idempotencyKey = `idempotency:${key}`;

    // 1. Check if result exists
    try {
        const cached = await redis.get<string>(idempotencyKey);
        if (cached) {
            console.log(`[Idempotency] returning cached result for ${key}`);
            return JSON.parse(typeof cached === 'string' ? cached : JSON.stringify(cached));
        }
    } catch {
        // If Redis fails, proceed with the operation
    }

    // 2. Execute operation
    const result = await operation();

    // 3. Store result
    const serialized = JSON.stringify(result);

    try {
        if (isRedisConfiguredFn()) {
            await (redis as any).setex(idempotencyKey, ttlSeconds, serialized);
        } else {
            await redis.set(idempotencyKey, serialized, { ex: ttlSeconds });
        }
    } catch (error) {
        console.error('[Idempotency] Failed to cache result:', error);
    }

    return result;
}

/**
 * Generate a unique idempotency key
 */
export function generateIdempotencyKey(): string {
    return crypto.randomUUID();
}
