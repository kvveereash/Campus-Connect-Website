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
export async function getSession() {
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) return null;
    try {
        const payload = await decrypt(session);
        if (!payload.userId) return null;

        const user = await prisma.user.findUnique({
            where: { id: payload.userId as string },
            select: { id: true, name: true, email: true, role: true, avatar: true }
        });

        if (!user) return null;

        return { ...payload, user };
    } catch (error) {
        return null;
    }
}
