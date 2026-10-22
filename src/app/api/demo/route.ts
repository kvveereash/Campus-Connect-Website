import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { createSession, passwordVersion } from '@/lib/auth';
import { checkRateLimit, demoLimiter, getClientIp, getRateLimitIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { DEMO_EMAIL } from '@/lib/demo-account';
import { resetDemo } from '@/lib/demo';

/*
 * "Try the demo": a plain form POST from our own pages signs the visitor into
 * the shared demo account and sends them to its profile. A form and a
 * redirect rather than a server action, so the session cookie is in place
 * before the next page loads (the login form explains why a soft navigation
 * misses it) and it works without JavaScript.
 *
 * Only from our own pages: without the Origin check another site could sign
 * its visitors in here, and anything they then typed would land in the demo.
 */
export async function POST(request: Request) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
    if (!origin || !host || new URL(origin).host !== host) {
        return new NextResponse('Start the demo from Campus Connect itself.', { status: 403 });
    }

    const back = (path: string) => NextResponse.redirect(new URL(path, origin), 303);

    const limit = await checkRateLimit(demoLimiter, getRateLimitIdentifier(undefined, await getClientIp()));
    if (!limit.success) return back('/login?demo=busy');

    try {
        const select = { id: true, name: true, email: true, role: true, password: true, deletedAt: true } as const;
        let demo = await prisma.user.findUnique({ where: { email: DEMO_EMAIL }, select });
        if (!demo || demo.deletedAt) {
            await resetDemo();
            demo = await prisma.user.findUnique({ where: { email: DEMO_EMAIL }, select });
        }
        if (!demo) throw new Error('demo account missing after reset');

        await createSession(demo.id, {
            role: demo.role,
            name: demo.name,
            email: demo.email,
            passwordVersion: passwordVersion(demo.password),
        });
        return back('/profile');
    } catch (error) {
        logger.error('Could not start the demo', error instanceof Error ? error : new Error(String(error)));
        return back('/login?demo=failed');
    }
}
