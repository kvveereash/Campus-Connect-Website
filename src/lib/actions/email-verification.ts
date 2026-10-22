'use server';

import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { DEMO_REFUSAL, isDemoEmail } from '@/lib/demo-account';
import { authLimiter, getRateLimitIdentifier, checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { hashVerificationToken, issueVerificationEmail } from '@/lib/email-verification';
import type { ActionState } from '@/types';

/**
 * Email verification.
 *
 * The app had none: an address was accepted at signup and never confirmed, so
 * nothing anywhere knew whether it could actually reach a person. That matters
 * here for a small, concrete reason — password reset is delivered by email,
 * and a reset link is only as good as the address it goes to.
 *
 * Deliberately soft. Verification is not required to sign in, join a club or
 * register for an event. Gating a working account on an email that might land
 * in spam is how you lock people out of a site they already belong to; the
 * unverified state is surfaced and left to the person to resolve.
 */

/**
 * Emails a fresh link to the signed-in user. Takes no id: the account is
 * always the session's, so this cannot be pointed at someone else's address.
 * Signup sends its first link through issueVerificationEmail directly.
 */
export async function sendVerificationEmail(): Promise<ActionState> {
    const session = await getSession();
    if (isDemoEmail(session?.user?.email)) return { success: false, error: DEMO_REFUSAL };
    if (!session?.userId) return { success: false, error: 'Not signed in' };

    // Per user, and under its own key: sharing the sign-in bucket meant a few
    // resends locked the user out of changing their password.
    const limit = await checkRateLimit(authLimiter, `${getRateLimitIdentifier(session.userId as string)}:verify-email`);
    if (!limit.success) {
        return { success: false, error: 'Just sent one. Give it a minute.' };
    }

    return issueVerificationEmail(session.userId as string);
}

/** Consumes a link. Returns why it failed, because the reasons differ. */
export async function verifyEmail(
    token: string
): Promise<{ status: 'ok' | 'used' | 'expired' | 'unknown'; email?: string }> {
    if (!token) return { status: 'unknown' };

    /* Wrapped because this table and column arrive with a migration, and a
       deployment can reach this code before the database has caught up — the
       two are separate steps, and on this project the hosted environment is
       configured separately again. An unmigrated database should make the
       feature inert, not make the page throw. */
    let row;
    try {
        row = await prisma.emailVerificationToken.findUnique({
            where: { token: hashVerificationToken(token) },
            select: {
                id: true,
                used: true,
                expiresAt: true,
                user: { select: { id: true, email: true, emailVerified: true, deletedAt: true } },
            },
        });
    } catch (error) {
        logger.error('Email verification unavailable', error as Error, {});
        return { status: 'unknown' };
    }

    if (!row || row.user.deletedAt) return { status: 'unknown' };

    // Already verified through an earlier link: that is a success from the
    // reader's point of view, not an error to explain.
    if (row.user.emailVerified) return { status: 'ok', email: row.user.email };

    if (row.used) return { status: 'used' };
    if (row.expiresAt < new Date()) return { status: 'expired' };

    await prisma.$transaction([
        prisma.emailVerificationToken.update({
            where: { id: row.id },
            data: { used: true },
        }),
        prisma.user.update({
            where: { id: row.user.id },
            data: { emailVerified: new Date() },
        }),
    ]);

    logger.auth('email_verified', row.user.id, {});

    return { status: 'ok', email: row.user.email };
}
