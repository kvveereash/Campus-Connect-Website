import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createSession, passwordVersion } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { safeRedirectPath } from '@/lib/utils';
import {
    GOOGLE_CALLBACK_PATH,
    GOOGLE_FLOW_COOKIE,
    GoogleAuthError,
    decodeGoogleFlow,
    exchangeGoogleCode,
    googleConfigured,
    googleRedirectUri,
    requestOrigin,
    resolveGoogleAccount,
    sameState,
    verifyGoogleIdToken,
} from '@/lib/google-oauth';

/*
 * Google sends the visitor back here with a one-time code. Every way this can
 * go wrong ends on the sign-in page with ?google=<reason>, which the page
 * turns into a sentence; nobody is shown a raw error.
 */
export async function GET(request: NextRequest) {
    const origin = requestOrigin(request);
    const params = request.nextUrl.searchParams;

    const cookieStore = await cookies();
    const flow = decodeGoogleFlow(cookieStore.get(GOOGLE_FLOW_COOKIE)?.value);
    // One use only, whatever happens next.
    cookieStore.delete({ name: GOOGLE_FLOW_COOKIE, path: GOOGLE_CALLBACK_PATH });

    const go = (path: string) => NextResponse.redirect(new URL(path, origin), 303);
    const back = (problem: string) => go(`/login?google=${problem}`);

    if (!googleConfigured()) return back('off');

    // The visitor pressed Cancel on Google's screen.
    const googleError = params.get('error');
    if (googleError) return back(googleError === 'access_denied' ? 'cancelled' : 'failed');

    /* No cookie, or a state that is not ours: a sign-in that took more than
       ten minutes, was finished in another browser, or was started by
       someone else's page to sign this visitor into the wrong account. */
    if (!flow || !sameState(params.get('state'), flow.state)) return back('expired');

    const code = params.get('code');
    if (!code || code.length > 2048) return back('failed');

    try {
        const redirectUri = googleRedirectUri(origin);
        const idToken = await exchangeGoogleCode(code, flow.codeVerifier, redirectUri);
        const profile = await verifyGoogleIdToken(idToken, flow.nonce);
        const decision = await resolveGoogleAccount(profile);

        if (decision.outcome === 'refused') {
            logger.auth('failed', undefined, { method: 'google', reason: decision.reason });
            return back(decision.reason);
        }

        const { user } = decision;
        await createSession(user.id, {
            role: user.role,
            name: user.name,
            email: user.email,
            passwordVersion: passwordVersion(user.password),
        });
        logger.auth(decision.outcome === 'created' ? 'signup' : 'login', user.id, {
            method: 'google',
            linked: decision.outcome === 'linked',
        });

        // Checked again: the cookie came back from the browser.
        const target = safeRedirectPath(flow.returnTo || null, origin, '/home');
        if (decision.outcome === 'created') {
            // A new student has no college yet; the welcome step asks, then continues to the target.
            return go(`/welcome?redirect=${encodeURIComponent(target)}`);
        }
        return go(target);
    } catch (error) {
        if (error instanceof GoogleAuthError) {
            logger.warn('Google sign-in failed', { reason: error.message });
        } else {
            logger.error('Google sign-in failed', error instanceof Error ? error : new Error(String(error)));
        }
        return back('failed');
    }
}
