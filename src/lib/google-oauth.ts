import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import prisma from '@/lib/db';
import { isDemoEmail } from '@/lib/demo-account';
import { cleanUserText } from '@/lib/sanitize';

/*
 * "Continue with Google": the authorization code flow with PKCE.
 *
 * /api/auth/google sends the visitor to Google with a random state, nonce and
 * code challenge, keeping the matching secrets in a short-lived cookie that
 * only these two routes receive. /api/auth/google/callback checks the state
 * against that cookie (so another site cannot finish a sign-in it started
 * and drop someone into the wrong account), trades the code for an ID token
 * with the client secret and the verifier, and verifies the token's
 * signature against Google's published keys before trusting a word of it.
 */

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

export const GOOGLE_FLOW_COOKIE = 'google_oauth';
/** Long enough to pick an account and approve; short enough that a stale tab cannot finish later. */
export const GOOGLE_FLOW_MAX_AGE = 10 * 60;
export const GOOGLE_CALLBACK_PATH = '/api/auth/google/callback';

/** Both halves must be set: the ID alone would send people to Google and fail on the way back. */
export function googleConfigured(): boolean {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

const base64url = (bytes: Buffer) => bytes.toString('base64url');

/** What the start route keeps in the cookie and the callback checks against. */
export interface GoogleFlow {
    state: string;
    nonce: string;
    codeVerifier: string;
    /** Already validated same-origin path, or '' for none. */
    returnTo: string;
}

/** S256: the SHA-256 of the verifier, base64url without padding (RFC 7636). */
export function codeChallengeFor(codeVerifier: string): string {
    return base64url(createHash('sha256').update(codeVerifier).digest());
}

export function createGoogleFlow(returnTo: string): GoogleFlow {
    return {
        state: base64url(randomBytes(32)),
        nonce: base64url(randomBytes(32)),
        // 32 bytes is 43 base64url characters, the shortest verifier RFC 7636 allows.
        codeVerifier: base64url(randomBytes(32)),
        returnTo,
    };
}

export function encodeGoogleFlow(flow: GoogleFlow): string {
    return Buffer.from(JSON.stringify(flow)).toString('base64url');
}

/** The cookie came back from the browser, so it is checked rather than trusted. */
export function decodeGoogleFlow(value: string | undefined): GoogleFlow | null {
    if (!value || value.length > 2048) return null;
    try {
        const parsed: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
        if (!parsed || typeof parsed !== 'object') return null;
        const { state, nonce, codeVerifier, returnTo } = parsed as Record<string, unknown>;
        if (typeof state !== 'string' || typeof nonce !== 'string' || typeof codeVerifier !== 'string') return null;
        if (!state || !nonce || codeVerifier.length < 43 || codeVerifier.length > 128) return null;
        return { state, nonce, codeVerifier, returnTo: typeof returnTo === 'string' ? returnTo : '' };
    } catch {
        return null;
    }
}

/** Constant-time, so the state cannot be guessed a character at a time. */
export function sameState(a: string | null | undefined, b: string | null | undefined): boolean {
    if (!a || !b) return false;
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * The address this request reached us on. Behind Netlify the forwarded
 * headers carry the public host; locally there are none and the request URL
 * is already right. The redirect URI built from it must match one registered
 * in Google Cloud exactly, so a preview deploy fails at Google, not here.
 */
export function requestOrigin(request: Request): string {
    const url = new URL(request.url);
    const first = (value: string | null) => value?.split(',')[0]?.trim() || null;
    const host = first(request.headers.get('x-forwarded-host')) ?? first(request.headers.get('host')) ?? url.host;
    const forwardedProto = first(request.headers.get('x-forwarded-proto'));
    const proto = forwardedProto === 'http' || forwardedProto === 'https' ? forwardedProto : url.protocol.replace(':', '');
    return `${proto}://${host}`;
}

export function googleRedirectUri(origin: string): string {
    return `${origin}${GOOGLE_CALLBACK_PATH}`;
}

export function googleAuthorizationUrl(flow: GoogleFlow, redirectUri: string, clientId = process.env.GOOGLE_CLIENT_ID ?? ''): string {
    const url = new URL(AUTHORIZE_URL);
    url.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state: flow.state,
        nonce: flow.nonce,
        code_challenge: codeChallengeFor(flow.codeVerifier),
        code_challenge_method: 'S256',
        // Shared laptops in a hostel are common; always ask which account.
        prompt: 'select_account',
    }).toString();
    return url.toString();
}

/** Thrown for every failure on the Google side. The message never carries a code or a token. */
export class GoogleAuthError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'GoogleAuthError';
    }
}

/** Trades the one-time code for Google's ID token. */
export async function exchangeGoogleCode(code: string, codeVerifier: string, redirectUri: string): Promise<string> {
    const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID ?? '',
            client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
            code_verifier: codeVerifier,
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
    });
    const body: unknown = await response.json().catch(() => null);
    const fields = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    if (!response.ok) {
        // Google's error code ("invalid_grant", "redirect_uri_mismatch") is safe to log; the body is not echoed.
        const reason = typeof fields.error === 'string' ? fields.error : `HTTP ${response.status}`;
        throw new GoogleAuthError(`Token exchange refused: ${reason}`);
    }
    if (typeof fields.id_token !== 'string') throw new GoogleAuthError('Token response had no ID token');
    return fields.id_token;
}

export interface GoogleProfile {
    /** Google's stable account id. */
    sub: string;
    email: string;
    emailVerified: boolean;
    name?: string;
    picture?: string;
}

// Built once per function instance: jose caches the keys and refetches only when Google rotates them.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

/** Verifies the ID token's signature, issuer, audience, expiry and nonce. */
export async function verifyGoogleIdToken(idToken: string, expectedNonce: string): Promise<GoogleProfile> {
    jwks ??= createRemoteJWKSet(new URL(JWKS_URL));
    let payload: Record<string, unknown>;
    try {
        ({ payload } = await jwtVerify(idToken, jwks, {
            issuer: ISSUERS,
            audience: process.env.GOOGLE_CLIENT_ID ?? '',
        }));
    } catch (error) {
        throw new GoogleAuthError(`ID token did not verify: ${error instanceof Error ? error.name : 'unknown'}`);
    }
    if (!sameState(typeof payload.nonce === 'string' ? payload.nonce : null, expectedNonce)) {
        throw new GoogleAuthError('ID token nonce did not match');
    }
    if (typeof payload.sub !== 'string' || !payload.sub || typeof payload.email !== 'string' || !payload.email) {
        throw new GoogleAuthError('ID token had no account id or email');
    }
    return {
        sub: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified === true || payload.email_verified === 'true',
        name: typeof payload.name === 'string' ? payload.name : undefined,
        picture: typeof payload.picture === 'string' ? payload.picture : undefined,
    };
}

/* ---------------- which Campus Connect account ---------------- */

const accountSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    password: true,
    googleId: true,
    emailVerified: true,
    lockedUntil: true,
    deletedAt: true,
} as const;

export interface GoogleAccountUser {
    id: string;
    name: string;
    email: string;
    role: string;
    password: string;
}

export type GoogleRefusal = 'unverified' | 'demo' | 'deleted' | 'locked' | 'other-google';

export type GoogleAccountDecision =
    | { outcome: 'signed-in' | 'linked' | 'created'; user: GoogleAccountUser }
    | { outcome: 'refused'; reason: GoogleRefusal };

const isUniqueViolation = (error: unknown) =>
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002';

function displayName(profile: GoogleProfile, email: string): string {
    const name = cleanUserText(profile.name ?? '').slice(0, 100).trim();
    // Signup asks for at least two characters; a Google account with no name gets the inbox name.
    return name.length >= 2 ? name : email.split('@')[0].slice(0, 100);
}

/** Google's photo, only over https: it is shown on every page the student posts on. */
function avatarFrom(picture: string | undefined): string | null {
    if (!picture || picture.length > 2048) return null;
    try {
        return new URL(picture).protocol === 'https:' ? picture : null;
    } catch {
        return null;
    }
}

const pick = ({ id, name, email, role, password }: GoogleAccountUser): GoogleAccountUser => ({ id, name, email, role, password });

/**
 * Finds the account a verified Google profile belongs to, linking or creating
 * one when needed, or says why it must not be signed into.
 *
 * Linking an existing account by email is safe only because Google has
 * confirmed the person holds that inbox (email_verified); without that,
 * anyone could add an address they do not own to a Google account and walk
 * into a student's account here.
 */
export async function resolveGoogleAccount(
    profile: GoogleProfile,
    now: Date = new Date(),
    retryOnConflict = true,
): Promise<GoogleAccountDecision> {
    if (!profile.emailVerified) return { outcome: 'refused', reason: 'unverified' };
    const email = profile.email.trim().toLowerCase();
    // The shared demo account is opened only by "Try the demo"; tying it to one person's Google would hand it to them.
    if (isDemoEmail(email)) return { outcome: 'refused', reason: 'demo' };

    const locked = (user: { lockedUntil: Date | null }) => user.lockedUntil !== null && user.lockedUntil > now;

    const byGoogle = await prisma.user.findUnique({ where: { googleId: profile.sub }, select: accountSelect });
    if (byGoogle) {
        if (byGoogle.deletedAt) return { outcome: 'refused', reason: 'deleted' };
        if (isDemoEmail(byGoogle.email)) return { outcome: 'refused', reason: 'demo' };
        if (locked(byGoogle)) return { outcome: 'refused', reason: 'locked' };
        return { outcome: 'signed-in', user: pick(byGoogle) };
    }

    // Case-insensitive: accounts made before addresses were lower-cased may hold capitals.
    const byEmail = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
        select: accountSelect,
    });
    if (byEmail) {
        // Already tied to a different Google account: swapping it silently would let whoever now holds this address take over.
        if (byEmail.googleId && byEmail.googleId !== profile.sub) return { outcome: 'refused', reason: 'other-google' };
        if (locked(byEmail)) return { outcome: 'refused', reason: 'locked' };
        const linked = await prisma.user.update({
            where: { id: byEmail.id },
            data: { googleId: profile.sub, ...(byEmail.emailVerified ? {} : { emailVerified: now }) },
            select: accountSelect,
        });
        return { outcome: 'linked', user: pick(linked) };
    }

    // The password column is required, so it holds the hash of a password nobody was ever told.
    // A Google-only student who wants one sets it through "Forgot password".
    const password = await bcrypt.hash(randomBytes(32).toString('base64url'), 12);
    try {
        const created = await prisma.user.create({
            data: {
                name: displayName(profile, email),
                email,
                password,
                googleId: profile.sub,
                emailVerified: now,
                avatar: avatarFrom(profile.picture),
                // The same defaults email signup stores; no college yet, the welcome step asks.
                department: 'General',
                year: '1st Year',
            },
            select: accountSelect,
        });
        return { outcome: 'created', user: pick(created) };
    } catch (error) {
        // Two tabs finishing at once: the other one created it, so look again rather than fail.
        if (retryOnConflict && isUniqueViolation(error)) return resolveGoogleAccount(profile, now, false);
        throw error;
    }
}
