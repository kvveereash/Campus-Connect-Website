import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/db';
import { checkRedisHealth } from '@/lib/rate-limit';

/**
 * Health Check Endpoint
 * 
 * Returns the health status of the application and its dependencies.
 * Use this for:
 * - Load balancer health checks
 * - Kubernetes liveness/readiness probes
 * - Monitoring dashboards
 * 
 * @returns JSON with health status
 */
export async function GET() {
    const startTime = Date.now();

    try {
        // Check dependencies in parallel
        const [dbHealthy, redisHealthy] = await Promise.all([
            checkDatabaseHealth(),
            checkRedisHealth(),
        ]);

        const responseTime = Date.now() - startTime;

        // Application is unhealthy if database is down
        // Redis being down is a warning but not critical (we have fallback)
        const isHealthy = dbHealthy;

        if (!isHealthy) {
            return NextResponse.json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                checks: {
                    database: { status: dbHealthy ? 'healthy' : 'unhealthy' },
                    redis: { status: redisHealthy ? 'healthy' : 'degraded', critical: false },
                },
                responseTimeMs: responseTime,
            }, { status: 503 });
        }

        return NextResponse.json({
            status: redisHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '0.1.0',
            environment: process.env.NODE_ENV || 'development',
            checks: {
                database: { status: 'healthy' },
                redis: { status: redisHealthy ? 'healthy' : 'degraded', critical: false },
            },
            responseTimeMs: responseTime,
        });
    } catch (error) {
        const responseTime = Date.now() - startTime;

        return NextResponse.json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            error: error instanceof Error ? error.message : 'Unknown error',
            checks: {
                database: { status: 'unknown' },
                redis: { status: 'unknown' },
            },
            responseTimeMs: responseTime,
        }, { status: 503 });
    }
}

/**
 * HEAD request for simple health check
 * Returns 200 if healthy, 503 if not
 */
export async function HEAD() {
    try {
        const dbHealthy = await checkDatabaseHealth();

        if (!dbHealthy) {
            return new NextResponse(null, { status: 503 });
        }

        return new NextResponse(null, { status: 200 });
    } catch {
        return new NextResponse(null, { status: 503 });
    }
}
