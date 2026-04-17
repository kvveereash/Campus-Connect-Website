'use server';

import { cookies, headers } from 'next/headers';
import crypto from 'crypto';

/**
 * CSRF Protection Utility
 * 
 * Implements double-submit cookie pattern for CSRF protection.
 * Works with server actions in Next.js.
 */

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
    return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Set CSRF token cookie (call this on page load)
 */
export async function setCsrfToken(): Promise<string> {
    const token = generateCsrfToken();
    const cookieStore = await cookies();

    cookieStore.set(CSRF_COOKIE_NAME, token, {
        httpOnly: false, // Must be readable by JavaScript
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
    });

    return token;
}

/**
 * Get current CSRF token from cookie
 */
export async function getCsrfToken(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(CSRF_COOKIE_NAME)?.value || null;
}

/**
 * Validate CSRF token
 * Compares cookie token with header token using timing-safe comparison
 * 
 * @throws Error if tokens don't match
 */
export async function validateCsrf(): Promise<void> {
    // Skip CSRF validation in development if explicitly disabled
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_CSRF === 'true') {
        return;
    }

    const cookieStore = await cookies();
    const headersList = await headers();

    const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
    const headerToken = headersList.get(CSRF_HEADER_NAME);

    // Both tokens must be present
    if (!cookieToken || !headerToken) {
        throw new Error('CSRF validation failed: Missing token');
    }

    // Use timing-safe comparison to prevent timing attacks
    const cookieBuffer = Buffer.from(cookieToken);
    const headerBuffer = Buffer.from(headerToken);

    if (cookieBuffer.length !== headerBuffer.length) {
        throw new Error('CSRF validation failed: Token mismatch');
    }

    if (!crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
        throw new Error('CSRF validation failed: Token mismatch');
    }
}

/**
 * CSRF validation result type
 */
export type CsrfValidationResult = {
    valid: boolean;
    error?: string;
};

/**
 * Safe CSRF validation that doesn't throw
 */
export async function validateCsrfSafe(): Promise<CsrfValidationResult> {
    try {
        await validateCsrf();
        return { valid: true };
    } catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error.message : 'CSRF validation failed'
        };
    }
}
