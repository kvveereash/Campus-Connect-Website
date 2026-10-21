'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/db';
import { createSession, deleteSession, getSession, passwordVersion } from '@/lib/auth';
import { authLimiter, getRateLimitIdentifier, checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import type { ActionState } from '@/types';

/**
 * The two things an account page has to be able to do, neither of which this
 * app could: change a password, and delete an account.
 *
 * Both require the current password even though the caller is already signed
 * in. A session cookie proves the browser was signed in at some point; it does
 * not prove the person at the keyboard is the account holder. For a password
 * change and an account deletion, that distinction is the whole point.
 */

const MIN_PASSWORD = 8;

export async function changePassword(
    currentPassword: string,
    newPassword: string
): Promise<ActionState> {
    const session = await getSession();
    if (!session?.userId) return { success: false, error: 'Not signed in' };

    if (newPassword.length < MIN_PASSWORD) {
        return { success: false, error: `Use at least ${MIN_PASSWORD} characters.` };
    }
    if (newPassword === currentPassword) {
        return { success: false, error: 'That is the password you already have.' };
    }

    // Same limiter as sign-in: this endpoint verifies a password, so it can be
    // used to guess one just as effectively.
    const limit = await checkRateLimit(authLimiter, getRateLimitIdentifier(session.userId as string));
    if (!limit.success) {
        return { success: false, error: 'Too many attempts. Try again in a minute.' };
    }

    const user = await prisma.user.findFirst({
        where: { id: session.userId as string, deletedAt: null },
        select: { id: true, password: true, role: true, name: true, email: true },
    });
    if (!user?.password) return { success: false, error: 'Account not found' };

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
        logger.auth('password_change_rejected', user.id, { reason: 'wrong_current' });
        return { success: false, error: 'That is not your current password.' };
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
        where: { id: user.id },
        data: { password: newHash },
    });

    // Every other device's session carried the old password's fingerprint and
    // is now refused by getSession; give this device a fresh one.
    await createSession(user.id, {
        role: user.role,
        name: user.name,
        email: user.email,
        passwordVersion: passwordVersion(newHash),
    });

    logger.auth('password_changed', user.id, {});

    return {
        success: true,
        message: 'Password changed. You have been signed out on every other device.',
    };
}

export async function deleteAccount(password: string): Promise<ActionState> {
    const session = await getSession();
    if (!session?.userId) return { success: false, error: 'Not signed in' };

    const limit = await checkRateLimit(authLimiter, getRateLimitIdentifier(session.userId as string));
    if (!limit.success) {
        return { success: false, error: 'Too many attempts. Try again in a minute.' };
    }

    const user = await prisma.user.findFirst({
        where: { id: session.userId as string, deletedAt: null },
        select: { id: true, password: true },
    });
    if (!user?.password) return { success: false, error: 'Account not found' };

    if (!(await bcrypt.compare(password, user.password))) {
        return { success: false, error: 'That is not your password.' };
    }

    /* What deletion means here, matching what the privacy policy promises.
     *
     * The row stays, because registrations and payments reference it and a
     * hard delete would tear holes in an organiser's attendee list and in
     * Stripe's records. Everything that identifies a person is removed
     * instead, and deletedAt is set so every listing, leaderboard and search
     * excludes them.
     *
     * The email is replaced rather than emptied: the column is required and
     * unique, so it needs a value, and a per-account invalid address keeps the
     * constraint satisfied while holding nothing real. The password is
     * replaced with a hash of a random string so the row cannot be signed into
     * even if some future query forgets to check deletedAt.
     */
    await prisma.$transaction([
        // The name is copied onto team requests, which are listed publicly.
        prisma.teamRequest.updateMany({
            where: { creatorId: user.id },
            data: { creatorName: 'Deleted account' },
        }),
        // Outstanding links must not outlive the account.
        prisma.passwordResetToken.updateMany({
            where: { userId: user.id, used: false },
            data: { used: true },
        }),
        prisma.emailVerificationToken.updateMany({
            where: { userId: user.id, used: false },
            data: { used: true },
        }),
        prisma.user.update({
            where: { id: user.id },
            data: {
                deletedAt: new Date(),
                name: 'Deleted account',
                email: `deleted+${user.id}@campus-connect.invalid`,
                password: await bcrypt.hash(crypto.randomUUID(), 12),
                avatar: null,
                bio: null,
                department: null,
                year: null,
                resumeUrl: null,
                achievements: null,
                projects: null,
                portfolioLinks: null,
                skills: { set: [] },
                interests: { set: [] },
            },
        }),
    ]);

    logger.auth('account_deleted', user.id, {});

    await deleteSession();
    revalidatePath('/');

    return { success: true, message: 'Your account has been deleted.' };
}
