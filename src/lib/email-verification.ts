import 'server-only';

import { createHash, randomBytes } from 'crypto';
import prisma from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { escapeHtml } from '@/lib/sanitize';
import type { ActionState } from '@/types';

const TOKEN_HOURS = 24;

export function hashVerificationToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

function verificationUrl(token: string) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    return `${base}/verify-email?token=${token}`;
}

/**
 * Issues a fresh link and emails it to the given account.
 *
 * Not a server action, and must not become one: it trusts the id it is given.
 * Callers are signup (the id of the account it just created) and
 * sendVerificationEmail (the session's own id).
 */
export async function issueVerificationEmail(userId: string): Promise<ActionState> {
    let user;
    try {
        user = await prisma.user.findFirst({
            where: { id: userId, deletedAt: null },
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
                // Stored as a hash; the emailed link carries the raw token.
                token: hashVerificationToken(token),
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
            // Escaped: the name is user-chosen, and unescaped it let anyone put
            // their own link into a real Campus Connect email.
            html: `<p>Hello ${escapeHtml(user.name)},</p><p>Confirm your email address:</p><p><a href="${url}">${url}</a></p><p>It works once and expires in ${TOKEN_HOURS} hours. If you did not sign up, ignore this — nothing will happen.</p><p>Campus Connect</p>`,
        });
    } catch (error) {
        logger.error('Failed to send verification email', error as Error, { userId: user.id });
        return { success: false, error: 'Could not send the email just now. Try again shortly.' };
    }

    return { success: true, message: 'Sent. Check your inbox.' };
}
