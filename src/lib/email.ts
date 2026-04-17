import { Resend } from 'resend';
import { logger } from '@/lib/logger';

// Initialize Resend if API key is present
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Default sender address
const FROM_EMAIL = process.env.EMAIL_FROM || 'Campus Connect <onboarding@resend.dev>';

interface SendEmailParams {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

/**
 * Send an email using Resend (production) or Console (development)
 */
export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
    // 1. Dev/Fallback Mode
    // If no API Key or explicitly in Mock mode (optional), log to console
    if (!resend) {
        if (process.env.NODE_ENV === 'production') {
            logger.warn('RESEND_API_KEY missing in production - email not sent', { to, subject });
        } else {
            console.log('=====================================');
            console.log('📧 [MOCK EMAIL SENT]');
            console.log(`To: ${to}`);
            console.log(`From: ${FROM_EMAIL}`);
            console.log(`Subject: ${subject}`);
            console.log('--- HTML Content ---');
            console.log(html.substring(0, 100) + '...');
            console.log('=====================================');
        }
        return { success: true, id: 'mock_' + Date.now() };
    }

    // 2. Production Mode
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject,
            html,
            text, // Optional plain text version
        });

        if (error) {
            logger.error('Failed to send email via Resend', new Error(error.message), {
                to,
                subject,
                error: error.name
            });
            return { success: false, error: error.message };
        }

        logger.info('Email sent successfully', { id: data?.id, to });
        return { success: true, id: data?.id };

    } catch (err) {
        logger.error('Exception sending email', err as Error, { to });
        return { success: false, error: 'Internal email error' };
    }
}

/**
 * Send Password Reset Email
 */
export async function sendPasswordResetEmail(email: string, resetUrl: string) {
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Reset Your Password</h2>
            <p>You requested a password reset for your Campus Connect account.</p>
            <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
            <a href="${resetUrl}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Reset Password</a>
            <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
    `;

    return sendEmail({
        to: email,
        subject: 'Reset your Campus Connect password',
        html,
        text: `Reset your password by visiting: ${resetUrl}`,
    });
}
