import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const secretKey = process.env.JWT_SECRET || 'fallback-secret-key-for-dev-only';
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is not defined in environment variables');
}
const key = new TextEncoder().encode(secretKey);

/**
 * Session payload stored inside the JWT
 */
export interface SessionPayload {
    userId: string;
    role: string;
    name: string;
    email: string;
    expires: string;
}

export async function encrypt(payload: Record<string, unknown>) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h') // Session lasts 24 hours
        .sign(key);
}

export async function decrypt(input: string): Promise<any> {
    const { payload } = await jwtVerify(input, key, {
        algorithms: ['HS256'],
    });
    return payload;
}

/**
 * Create a session with user metadata baked into the JWT.
 * This eliminates the need for a DB lookup on every request.
 */
export async function createSession(
    userId: string,
    userInfo?: { role?: string; name?: string; email?: string }
) {
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
    const session = await encrypt({
        userId,
        role: userInfo?.role ?? 'USER',
        name: userInfo?.name ?? '',
        email: userInfo?.email ?? '',
        expires: expires.toISOString(),
    });

    const cookieStore = await cookies();

    // Save the session in a cookie
    cookieStore.set('session', session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires,
        sameSite: 'lax',
        path: '/',
    });
}

/**
 * Refresh the session token (e.g. after role change or profile update).
 * Re-mints the JWT with updated user data.
 */
export async function refreshSession(
    userId: string,
    userInfo: { role: string; name: string; email: string }
) {
    await createSession(userId, userInfo);
}

export async function deleteSession() {
    const cookieStore = await cookies();
    cookieStore.delete('session');
}

/**
 * Lightweight session check — reads ONLY from the JWT token.
 * No DB access. Use for quick auth/role checks in middleware.
 */
export async function getSessionFromToken(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) return null;

    try {
        const payload = await decrypt(session);
        if (!payload.userId) return null;

        // Check if session is expired
        if (payload.expires && new Date(payload.expires) < new Date()) {
            return null;
        }

        return {
            userId: payload.userId as string,
            role: payload.role as string || 'USER',
            name: payload.name as string || '',
            email: payload.email as string || '',
            expires: payload.expires as string,
        };
    } catch {
        return null;
    }
}

/**
 * Edge-compatible session check for middleware
 * Only validates JWT without database access
 */
export async function getSessionFromRequest(request: NextRequest) {
    const session = request.cookies.get('session')?.value;
    if (!session) return null;

    try {
        const payload = await decrypt(session);
        if (!payload.userId) return null;

        // Check if session is expired
        if (payload.expires && new Date(payload.expires) < new Date()) {
            return null;
        }

        return {
            userId: payload.userId as string,
            user: {
                id: payload.userId as string,
                role: payload.role as string || 'USER',
                name: payload.name as string || '',
                email: payload.email as string || '',
            }
        };
    } catch (error) {
        console.error('[Auth] Error decrypting session:', error);
        return null;
    }
}
