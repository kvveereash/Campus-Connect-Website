import { PrismaClient, Prisma } from '@prisma/client'

/**
 * Enhanced Prisma Client Configuration
 * 
 * Features:
 * - Singleton pattern to prevent connection exhaustion
 * - Slow query logging (>500ms queries logged as warnings)
 * - Query timing in development
 * - Structured error logging
 */

const SLOW_QUERY_THRESHOLD_MS = 500

// Fail loudly at startup rather than handing Prisma an undefined URL and
// getting an opaque connection error on the first query.
if (!process.env.DATABASE_URL) {
    throw new Error(
        'DATABASE_URL is not set. Copy .env.example to .env and fill it in ' +
        '(locally), or set it in the Netlify dashboard (production).'
    )
}

const prismaClientSingleton = () => {
    const client = new PrismaClient({
        datasourceUrl: process.env.DATABASE_URL,
        log: [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
            ...(process.env.NODE_ENV === 'development'
                ? [{ emit: 'event' as const, level: 'info' as const }]
                : []),
        ],
    })

    // ── Slow Query Detection ──
    // @ts-ignore - Prisma event typing
    client.$on('query', (e: Prisma.QueryEvent) => {
        if (e.duration > SLOW_QUERY_THRESHOLD_MS) {
            console.warn(
                `[Database] ⚠️ Slow query detected (${e.duration}ms):`,
                e.query.substring(0, 200),
                e.params ? `| params: ${e.params.substring(0, 100)}` : ''
            )
        }
    })

    // @ts-ignore - Prisma event typing
    client.$on('error', (e: Prisma.LogEvent) => {
        console.error('[Database] ❌ Error:', e.message)
    })

    // @ts-ignore - Prisma event typing
    client.$on('warn', (e: Prisma.LogEvent) => {
        console.warn('[Database] ⚠️ Warning:', e.message)
    })

    return client
}

declare const globalThis: {
    prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined
} & typeof global

const db = globalThis.prismaGlobal ?? prismaClientSingleton()

export default db

// Prevent multiple instances in development (hot reload)
if (process.env.NODE_ENV !== 'production') {
    globalThis.prismaGlobal = db
}

/**
 * Graceful shutdown helper
 * Call this in your shutdown handler
 */
export async function disconnectDatabase() {
    await db.$disconnect()
    console.log('[Database] Connection closed')
}

/**
 * Health check for database connection
 * Returns latency in ms alongside health boolean
 */
export async function checkDatabaseHealth(): Promise<boolean> {
    return (await diagnoseDatabase()).healthy
}

export type DatabaseFailure =
    | 'engine-missing'   // Prisma has no query engine for this platform
    | 'auth-failed'      // wrong user or password in DATABASE_URL
    | 'unreachable'      // host/port wrong, DNS, IPv6-only host, project paused
    | 'database-missing' // the database name in the URL does not exist
    | 'invalid-url'      // DATABASE_URL is not a valid connection string
    | 'timeout'          // reached nothing in time (often unreachable, or pool exhausted)
    | 'other'

/**
 * Health check that says why it failed, in terms safe to show publicly: a
 * fixed category and Prisma's error code, never the message (which can carry
 * the host and user). /api/health returns this so a broken deployment can be
 * diagnosed without access to the host's logs.
 */
export async function diagnoseDatabase(): Promise<
    { healthy: true; latencyMs: number } | { healthy: false; reason: DatabaseFailure; code?: string }
> {
    try {
        const start = Date.now()
        await db.$queryRaw`SELECT 1`
        const latencyMs = Date.now() - start

        if (latencyMs > 1000) {
            console.warn(`[Database] Health check slow: ${latencyMs}ms`)
        }

        return { healthy: true, latencyMs }
    } catch (error) {
        console.error('[Database] Health check failed:', error)
        const code = (error as { errorCode?: string; code?: string })?.errorCode
            ?? (error as { code?: string })?.code
        const message = error instanceof Error ? error.message : ''

        let reason: DatabaseFailure = 'other'
        if (/Query Engine|query-engine|libquery_engine|binaryTargets/i.test(message)) reason = 'engine-missing'
        else if (code === 'P1000') reason = 'auth-failed'
        else if (code === 'P1001' || code === 'P1017') reason = 'unreachable'
        else if (code === 'P1003') reason = 'database-missing'
        else if (code === 'P1013') reason = 'invalid-url'
        else if (code === 'P1002' || code === 'P1008' || code === 'P2024') reason = 'timeout'

        return { healthy: false, reason, code: typeof code === 'string' && /^P\d{4}$/.test(code) ? code : undefined }
    }
}

/**
 * Detailed health check returning latency info
 */
export async function getDatabaseHealthDetails(): Promise<{
    healthy: boolean
    latencyMs: number
    connectionCount?: number
}> {
    try {
        const start = Date.now()
        await db.$queryRaw`SELECT 1`
        const latencyMs = Date.now() - start

        return { healthy: true, latencyMs }
    } catch (error) {
        console.error('[Database] Detailed health check failed:', error)
        return { healthy: false, latencyMs: -1 }
    }
}
