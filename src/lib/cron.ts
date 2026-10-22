import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

/*
 * Scheduled jobs (netlify/functions/*.mjs) call routes under /api/cron with
 * `Authorization: Bearer <CRON_SECRET>`. With no secret set the jobs are off:
 * the routes answer 503 rather than run for anyone who finds them.
 */

/** A response to send instead of running the job, or null when the caller is the scheduler. */
export function refuseUnlessCron(request: Request): NextResponse | null {
    const secret = process.env.CRON_SECRET;
    if (!secret || secret.length < 16) {
        return NextResponse.json({ error: 'Scheduled jobs are off: CRON_SECRET is not set.' }, { status: 503 });
    }
    const given = Buffer.from(request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '');
    const expected = Buffer.from(secret);
    const ok = given.length === expected.length && timingSafeEqual(given, expected);
    return ok ? null : new NextResponse(null, { status: 401 });
}
