import sanitizeHtml from 'sanitize-html';

/**
 * Sanitization configuration for different content types
 * Using sanitize-html which is fully compatible with Next.js server components
 */

/**
 * Sanitize rich text content (posts, comments)
 * Allows basic formatting tags but removes dangerous HTML/scripts
 */
export function sanitizeRichText(input: string): string {
    if (!input || typeof input !== 'string') return '';

    return sanitizeHtml(input, {
        allowedTags: [
            'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li',
            'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
        ],
        allowedAttributes: {
            'a': ['href', 'target', 'rel']
        },
        allowedSchemes: ['http', 'https', 'mailto'],
        // Remove all other attributes
        allowedSchemesByTag: {},
        allowedSchemesAppliedToAttributes: ['href'],
    });
}

/**
 * Sanitize plain text (chat messages, user names)
 * Strips all HTML tags but keeps the text content
 */
export function sanitizePlainText(input: string): string {
    if (!input || typeof input !== 'string') return '';

    return sanitizeHtml(input, {
        allowedTags: [],
        allowedAttributes: {},
    });
}

/**
 * Sanitize URL
 * Ensures URL is safe and doesn't contain javascript: or data: schemes
 */
export function sanitizeUrl(input: string): string {
    if (!input || typeof input !== 'string') return '';

    // Remove dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    const lowerInput = input.toLowerCase().trim();

    for (const protocol of dangerousProtocols) {
        if (lowerInput.startsWith(protocol)) {
            return '';
        }
    }

    // Only allow http, https, and mailto
    if (!lowerInput.startsWith('http://') &&
        !lowerInput.startsWith('https://') &&
        !lowerInput.startsWith('mailto:') &&
        !lowerInput.startsWith('/')) {
        return '';
    }

    return input.trim();
}

/**
 * Sanitize object with multiple fields
 * Useful for sanitizing form data
 */
export function sanitizeObject<T extends Record<string, any>>(
    obj: T,
    fieldConfig: Record<keyof T, 'richText' | 'plainText' | 'url' | 'skip'>
): T {
    const sanitized = { ...obj };

    for (const [key, type] of Object.entries(fieldConfig)) {
        const value = sanitized[key as keyof T];

        if (typeof value !== 'string') continue;

        switch (type) {
            case 'richText':
                sanitized[key as keyof T] = sanitizeRichText(value) as any;
                break;
            case 'plainText':
                sanitized[key as keyof T] = sanitizePlainText(value) as any;
                break;
            case 'url':
                sanitized[key as keyof T] = sanitizeUrl(value) as any;
                break;
            case 'skip':
                // Don't sanitize (for fields like passwords, IDs)
                break;
        }
    }

    return sanitized;
}

/**
 * Escape HTML entities for display
 * Use when you want to show HTML as text (not render it)
 */
export function escapeHtml(input: string): string {
    if (!input || typeof input !== 'string') return '';

    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(input: string): string {
    if (!input || typeof input !== 'string') return '';

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmed = input.trim().toLowerCase();

    if (!emailRegex.test(trimmed)) {
        return '';
    }

    return sanitizePlainText(trimmed);
}

/**
 * Truncate text to a maximum length
 * Useful for preventing extremely long inputs
 */
export function truncateText(input: string, maxLength: number): string {
    if (!input || typeof input !== 'string') return '';

    if (input.length <= maxLength) return input;

    return input.substring(0, maxLength) + '...';
}
