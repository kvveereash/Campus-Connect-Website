import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { checkRateLimit, getClientIp, getRateLimitIdentifier, googleAuthLimiter } from '@/lib/rate-limit';
import { safeRedirectPath } from '@/lib/utils';
import {
    GOOGLE_CALLBACK_PATH,
    GOOGLE_FLOW_COOKIE,
    GOOGLE_FLOW_MAX_AGE,
    createGoogleFlow,
    encodeGoogleFlow,
    googleAuthorizationUrl,
    googleConfigured,
    googleRedirectUri,
    requestOrigin,
} from '@/lib/google-oauth';

/*
 * "Continue with Google" starts here. Reached by a plain link rather than a
 * form: the CSP's form-action 'self' also covers redirects that follow a form
 * submission, so a form posting here could not go on to accounts.google.com.
 */
export async function GET(request: NextRequest) {
    const origin = requestOrigin(request);
    const back = (problem: string) => NextResponse.redirect(new URL(`/login?google=${problem}`, origin), 303);

    if (!googleConfigured()) return back('off');

    const limit = await checkRateLimit(googleAuthLimiter, getRateLimitIdentifier(undefined, await getClientIp()));
    if (!limit.success) return back('busy');

    const returnTo = safeRedirectPath(request.nextUrl.searchParams.get('redirect'), origin, '');
    const flow = createGoogleFlow(returnTo);

    const cookieStore = await cookies();
    cookieStore.set(GOOGLE_FLOW_COOKIE, encodeGoogleFlow(flow), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        // Lax, not Strict: the way back is a top-level navigation from Google, which Strict would strip it from.
        sameSite: 'lax',
        maxAge: GOOGLE_FLOW_MAX_AGE,
        // Only the callback needs it; no other request should carry it.
        path: GOOGLE_CALLBACK_PATH,
    });

    return NextResponse.redirect(googleAuthorizationUrl(flow, googleRedirectUri(origin)), 302);
}
