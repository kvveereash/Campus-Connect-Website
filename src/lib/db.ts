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

// Explicitly set the environment variable for Prisma's query engine
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "postgresql://postgres.esvxkoizojyrwhtqynck:15aug2004%40veereash@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
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
    try {
        const start = Date.now()
        await db.$queryRaw`SELECT 1`
        const latency = Date.now() - start

        if (latency > 1000) {
            console.warn(`[Database] Health check slow: ${latency}ms`)
        }

        return true
    } catch (error) {
        console.error('[Database] Health check failed:', error)
        return false
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
