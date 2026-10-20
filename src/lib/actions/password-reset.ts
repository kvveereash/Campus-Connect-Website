'use server';

import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import { sendPasswordResetEmail } from '@/lib/email';
import { authLimiter, checkRateLimit } from '@/lib/rate-limit';

const MIN_PASSWORD_LENGTH = 8;

/**
 * Generate a secure random token for password reset
 */
function generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * What is stored for a token. The link carries the raw token; the database
 * keeps only its SHA-256, so a leaked database or backup cannot be replayed
 * as working reset links. A plain hash is enough here (no bcrypt): the token
 * is 256 random bits, so there is nothing to brute-force.
 */
function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Request a password reset
 * Creates a token and sends email
 */
export async function requestPasswordReset(email: string) {
    if (typeof email !== 'string' || !email.trim()) {
        return { success: false, error: 'Enter your email address' };
    }
    const normalizedEmail = email.trim().toLowerCase();

    try {
        // Keyed on the address, so one inbox cannot be flooded with reset
        // mail. Answers like success, so it reveals nothing about the account.
        const limit = await checkRateLimit(authLimiter, `reset:${normalizedEmail}`);
        if (!limit.success) {
            return { success: true, message: 'If an account exists, a reset link will be sent.' };
        }

        // 1. Find user by email
        //    deletedAt: null for the same reason login checks it — a deleted
        //    account must not be recoverable through the reset flow.
        const user = await prisma.user.findFirst({
            where: { email: normalizedEmail, deletedAt: null }
        });

        // Always return success to prevent email enumeration attacks
        if (!user) {
            return { success: true, message: 'If an account exists, a reset link will be sent.' };
        }

        // 2. Invalidate any existing tokens
        await prisma.passwordResetToken.updateMany({
            where: { userId: user.id, used: false },
            data: { used: true }
        });

        // 3. Generate new token
        const token = generateToken();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await prisma.passwordResetToken.create({
            data: {
                token: hashToken(token),
                userId: user.id,
                expiresAt
            }
        });

        // 4. Send email
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const resetUrl = `${baseUrl}/reset-password/${token}`;

        await sendPasswordResetEmail(user.email, resetUrl);

        return { success: true, message: 'If an account exists, a reset link will be sent.' };
    } catch (error) {
        console.error('Password reset request failed:', error);
        return { success: false, error: 'Failed to process request' };
    }
}

/**
 * Verify a password reset token
 */
export async function verifyResetToken(token: string) {
    if (typeof token !== 'string' || !token) return { valid: false, error: 'Invalid or expired link' };

    try {
        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { token: hashToken(token) },
            include: { user: { select: { email: true } } }
        });

        if (!resetToken) {
            return { valid: false, error: 'Invalid or expired link' };
        }

        if (resetToken.used) {
            return { valid: false, error: 'This link has already been used' };
        }

        if (new Date() > resetToken.expiresAt) {
            return { valid: false, error: 'This link has expired' };
        }

        return { valid: true, email: resetToken.user.email };
    } catch (error) {
        console.error('Token verification failed:', error);
        return { valid: false, error: 'Verification failed' };
    }
}

/**
 * Reset password using a valid token
 */
export async function resetPassword(token: string, newPassword: string) {
    // The page checks this too, but the page is not the only caller.
    if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
        return { success: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
    }
    if (typeof token !== 'string' || !token) {
        return { success: false, error: 'Invalid or expired link' };
    }

    try {
        // 1. Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // 2. Claim the token and set the password together. The claim is a
        //    conditional updateMany, so two requests racing on one link cannot
        //    both get through: the second finds nothing unused to claim.
        const updated = await prisma.$transaction(async (tx) => {
            const claimed = await tx.passwordResetToken.updateMany({
                where: { token: hashToken(token), used: false, expiresAt: { gt: new Date() } },
                data: { used: true }
            });
            if (claimed.count === 0) return false;

            const resetToken = await tx.passwordResetToken.findUnique({
                where: { token: hashToken(token) },
                select: { userId: true }
            });
            if (!resetToken) return false;

            // Clearing the lock too: someone locked out by failed attempts is
            // exactly who resets their password.
            await tx.user.update({
                where: { id: resetToken.userId },
                data: { password: hashedPassword, lockedUntil: null }
            });
            return true;
        });

        if (!updated) {
            return { success: false, error: 'Invalid or expired link' };
        }

        return { success: true, message: 'Password reset successful' };
    } catch (error) {
        console.error('Password reset failed:', error);
        return { success: false, error: 'Failed to reset password' };
    }
}
