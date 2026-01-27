'use server';

import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';

/**
 * Generate a secure random token for password reset
 */
function generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Send password reset email
 * In development: logs to console
 * In production: integrate with Resend/SendGrid
 */
async function sendResetEmail(email: string, resetUrl: string) {
    if (process.env.NODE_ENV === 'development') {
        console.log('=====================================');
        console.log('📧 PASSWORD RESET EMAIL (DEV MODE)');
        console.log('=====================================');
        console.log(`To: ${email}`);
        console.log(`Reset URL: ${resetUrl}`);
        console.log('=====================================');
        return true;
    }

    // Production: Add Resend/SendGrid integration here
    // Example with Resend:
    // const { Resend } = await import('resend');
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //     from: 'noreply@campusconnect.com',
    //     to: email,
    //     subject: 'Reset Your Password',
    //     html: `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`
    // });

    console.log(`Password reset email sent to ${email}`);
    return true;
}

/**
 * Request a password reset
 * Creates a token and sends email
 */
export async function requestPasswordReset(email: string) {
    try {
        // 1. Find user by email
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
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
                token,
                userId: user.id,
                expiresAt
            }
        });

        // 4. Send email
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const resetUrl = `${baseUrl}/reset-password/${token}`;

        await sendResetEmail(email, resetUrl);

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
    try {
        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { token },
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
    try {
        // 1. Verify token
        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { token }
        });

        if (!resetToken || resetToken.used || new Date() > resetToken.expiresAt) {
            return { success: false, error: 'Invalid or expired link' };
        }

        // 2. Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // 3. Update password and mark token as used
        await prisma.$transaction([
            prisma.user.update({
                where: { id: resetToken.userId },
                data: { password: hashedPassword }
            }),
            prisma.passwordResetToken.update({
                where: { id: resetToken.id },
                data: { used: true }
            })
        ]);

        return { success: true, message: 'Password reset successful' };
    } catch (error) {
        console.error('Password reset failed:', error);
        return { success: false, error: 'Failed to reset password' };
    }
}
