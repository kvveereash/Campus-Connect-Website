'use server';

import { randomBytes } from 'crypto';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { authLimiter, getRateLimitIdentifier, checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
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

const TOKEN_HOURS = 24;

function verificationUrl(token: string) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    return `${base}/verify-email?token=${token}`;
}

/** Issues a fresh link and emails it. Used at signup and from the banner. */
export async function sendVerificationEmail(userId?: string): Promise<ActionState> {
    let id = userId;

    // Called without an id from the banner, where the session is the subject.
    if (!id) {
        const session = await getSession();
        if (!session?.userId) return { success: false, error: 'Not signed in' };
        id = session.userId as string;

        // Only rate-limited on the self-serve path; the signup path is already
        // behind the signup limiter.
        const limit = await checkRateLimit(authLimiter, await getRateLimitIdentifier());
        if (!limit.success) {
            return { success: false, error: 'Just sent one. Give it a minute.' };
        }
    }

    let user;
    try {
        user = await prisma.user.findFirst({
            where: { id, deletedAt: null },
            select: { id: true, email: true, name: true, emailVerified: true },
        });
    } catch (error) {
        // Same reason as verifyEmail: the column may not exist yet.
        logger.error('Email verification unavailable', error as Error, {});
        return { success: false, error: 'Email confirmation is not available yet.' };
    }
    if (!user) return { success: false, error: 'Account not found' };
    if (user.emailVerified) {
        return { success: true, message: 'That address is already confirmed.' };
    }

    const token = randomBytes(32).toString('hex');
    try {
        // Any outstanding link for this account stops working, so a forwarded
        // old email cannot be used after a newer one is requested.
        await prisma.emailVerificationToken.updateMany({
            where: { userId: user.id, used: false },
            data: { used: true },
        });
        await prisma.emailVerificationToken.create({
            data: {
                token,
                userId: user.id,
                expiresAt: new Date(Date.now() + TOKEN_HOURS * 60 * 60 * 1000),
            },
        });
    } catch (error) {
        logger.error('Could not issue a verification token', error as Error, { userId: user.id });
        return { success: false, error: 'Email confirmation is not available yet.' };
    }

    const url = verificationUrl(token);

    try {
        await sendEmail({
            to: user.email,
            subject: 'Confirm your email for Campus Connect',
            text: `Hello ${user.name},\n\nConfirm your email address by opening this link:\n\n${url}\n\nIt works once and expires in ${TOKEN_HOURS} hours. If you did not sign up, ignore this — nothing will happen.\n\nCampus Connect`,
            html: `<p>Hello ${user.name},</p><p>Confirm your email address:</p><p><a href="${url}">${url}</a></p><p>It works once and expires in ${TOKEN_HOURS} hours. If you did not sign up, ignore this — nothing will happen.</p><p>Campus Connect</p>`,
        });
    } catch (error) {
        logger.error('Failed to send verification email', error as Error, { userId: user.id });
        return { success: false, error: 'Could not send the email just now. Try again shortly.' };
    }

    return { success: true, message: `Sent. Check ${user.email}.` };
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
            where: { token },
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
