// Cache utilities for Next.js server actions
// Note: This is NOT a 'use server' file - it provides utilities used by server actions

import { unstable_cache } from 'next/cache';

/**
 * Cache configuration for different data types
 */
export const CACHE_TAGS = {
    EVENTS: 'events',
    CLUBS: 'clubs',
    COLLEGES: 'colleges',
    USER: 'user',
} as const;

export const CACHE_TTL = {
    EVENTS_LIST: 60,      // 60 seconds for event lists
    EVENTS_DETAIL: 120,   // 2 minutes for single event
    CLUBS_LIST: 120,      // 2 minutes for club lists
    CLUBS_DETAIL: 180,    // 3 minutes for club details
    COLLEGES: 300,        // 5 minutes for colleges (rarely change)
    USER_SESSION: 30,     // 30 seconds for user session
} as const;

/**
 * Create a cached version of a server action
 * @param fn - The async function to cache
 * @param keyParts - Array of strings to form the cache key
 * @param options - Cache options (tags, revalidate time)
 */
export function createCachedAction<T>(
    fn: () => Promise<T>,
    keyParts: string[],
    options: {
        tags?: string[];
        revalidate?: number;
    }
): () => Promise<T> {
    return unstable_cache(
        fn,
        keyParts,
        {
            tags: options.tags,
            revalidate: options.revalidate ?? 60,
        }
    );
}

/**
 * Create a cached action with dynamic key parts (for filters/pagination)
 */
export function createCachedActionWithArgs<TArgs extends any[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>,
    baseKey: string,
    options: {
        tags?: string[];
        revalidate?: number;
    }
): (...args: TArgs) => Promise<TResult> {
    return async (...args: TArgs) => {
        const keyParts = [baseKey, JSON.stringify(args)];
        const cached = unstable_cache(
            () => fn(...args),
            keyParts,
            {
                tags: options.tags,
                revalidate: options.revalidate ?? 60,
            }
        );
        return cached();
    };
}

/**
 * Simple in-memory request-level cache for deduplication
 * Prevents duplicate DB calls within the same request
 */
const requestCache = new Map<string, Promise<any>>();

export function dedupeRequest<T>(
    key: string,
    fn: () => Promise<T>
): Promise<T> {
    if (requestCache.has(key)) {
        return requestCache.get(key) as Promise<T>;
    }

    const promise = fn().finally(() => {
        // Clean up after request completes
        requestCache.delete(key);
    });

    requestCache.set(key, promise);
    return promise;
}
