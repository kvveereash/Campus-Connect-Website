import { cache } from 'react';
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
            select: { id: true, name: true, email: true, role: true, avatar: true, collegeId: true, deletedAt: true }
        });

        // A deleted account's sessions on other devices end here. deleteAccount
        // can only clear the cookie in the browser that asked, and the JWT
        // stays valid for up to a day.
        if (!user || user.deletedAt) return null;

        const { deletedAt: _deletedAt, ...sessionUser } = user;
        return { ...payload, user: sessionUser };
    } catch (error) {
        return null;
    }
}
