import { cache } from 'react';
import { createHash } from 'crypto';
import { decrypt } from './auth-edge';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';

// Re-export everything from edge-safe auth
export * from './auth-edge';

/**
 * Get the current session.
 * First reads from the JWT token (fast, no DB hit).
 * Then hydrates with fresh user data from DB for critical fields.
 * 
 * ⚠️ NODE.JS RUNTIME ONLY (Uses Prisma)
 */
/**
 * A short fingerprint of a user's password hash, carried in their session.
 *
 * Sessions are stateless JWTs that live for a day, so changing or resetting
 * a password used to leave every other signed-in device signed in: someone
 * with a stolen cookie kept access after the owner reset the password to get
 * rid of them. The hash changes whenever the password does, so a token minted
 * before that no longer matches and getSession refuses it. Not reversible: a
 * slice of a SHA-256 of a bcrypt hash.
 */
export function passwordVersion(passwordHash: string | null | undefined): string {
    if (!passwordHash) return '';
    return createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);
}

export const getSession = cache(getSessionUncached);

/* Wrapped in React's cache() above: a page, its layout and every server
   action they call ask for the session separately, and each ask was a user
   lookup in a database a continent away from the functions. Now the first
   ask in a request does the lookup and the rest share its answer. */
async function getSessionUncached() {
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) return null;
    try {
        const payload = await decrypt(session);
        if (!payload.userId) return null;

        const user = await prisma.user.findUnique({
            where: { id: payload.userId as string },
            select: { id: true, name: true, email: true, role: true, avatar: true, collegeId: true, deletedAt: true, password: true }
        });

        // A deleted account's sessions on other devices end here. deleteAccount
        // can only clear the cookie in the browser that asked, and the JWT
        // stays valid for up to a day.
        if (!user || user.deletedAt) return null;

        // Signed in before the password last changed: this session is over.
        if (payload.pv !== passwordVersion(user.password)) return null;

        const { deletedAt: _deletedAt, password: _password, ...sessionUser } = user;
        return { ...payload, userId: payload.userId, user: sessionUser };
    } catch {
        return null;
    }
}
