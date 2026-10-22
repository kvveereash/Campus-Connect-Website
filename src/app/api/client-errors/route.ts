import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { checkRateLimit, clientErrorLimiter, getClientIp, getRateLimitIdentifier } from '@/lib/rate-limit';

/*
 * Receives crash reports from src/lib/report-error.ts and writes them to the
 * function log. Anyone can call this, so it takes a small body, keeps only
 * known fields as short strings, and is rate limited; it stores nothing.
 */

const MAX_BODY = 4096;

const field = (value: unknown, max: number) => (typeof value === 'string' ? value.slice(0, max) : undefined);

/* A path can carry a secret: /reset-password/<token>. Any segment long enough
   to be a token is replaced; ids (25-character cuids) stay readable. */
function safePath(value: unknown) {
    const path = field(value, 300);
    if (!path) return undefined;
    return path
        .split('?')[0]
        .split('/')
        .map((segment) => (segment.length >= 32 ? '[redacted]' : segment))
        .join('/');
}

export async function POST(request: Request) {
    const ip = await getClientIp();
    const limit = await checkRateLimit(clientErrorLimiter, getRateLimitIdentifier(undefined, ip));
    if (!limit.success) return new NextResponse(null, { status: 429 });

    const text = await request.text();
    if (text.length > MAX_BODY) return new NextResponse(null, { status: 413 });

    let report: Record<string, unknown>;
    try {
        const parsed: unknown = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') return new NextResponse(null, { status: 400 });
        report = parsed as Record<string, unknown>;
    } catch {
        return new NextResponse(null, { status: 400 });
    }

    logger.warn('Page crashed in the browser', {
        boundary: field(report.boundary, 10),
        digest: field(report.digest, 40),
        errorName: field(report.name, 80),
        errorMessage: field(report.message, 300),
        path: safePath(report.path),
        requestId: request.headers.get('x-request-id') ?? undefined,
    });

    return new NextResponse(null, { status: 204 });
}
