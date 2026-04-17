import {
    sanitizeRichText,
    sanitizePlainText,
    sanitizeUrl,
    sanitizeEmail,
    escapeHtml,
    truncateText,
    sanitizeObject,
} from '../sanitize';

describe('sanitize utilities', () => {
    // ── sanitizeRichText() ──

    describe('sanitizeRichText()', () => {
        it('preserves safe HTML tags', () => {
            const input = '<p>Hello <strong>world</strong></p>';
            expect(sanitizeRichText(input)).toBe('<p>Hello <strong>world</strong></p>');
        });

        it('strips script tags (XSS prevention)', () => {
            const input = '<p>Hello</p><script>alert("xss")</script>';
            expect(sanitizeRichText(input)).not.toContain('<script>');
            expect(sanitizeRichText(input)).toContain('Hello');
        });

        it('strips event handler attributes', () => {
            const input = '<p onmouseover="alert(1)">Test</p>';
            expect(sanitizeRichText(input)).not.toContain('onmouseover');
        });

        it('strips iframe tags', () => {
            const input = '<iframe src="http://evil.com"></iframe>';
            expect(sanitizeRichText(input)).not.toContain('<iframe');
        });

        it('handles empty/null-like inputs gracefully', () => {
            expect(sanitizeRichText('')).toBe('');
            expect(sanitizeRichText(null as any)).toBe('');
            expect(sanitizeRichText(undefined as any)).toBe('');
        });

        it('preserves allowed link tags with safe href', () => {
            const input = '<a href="https://example.com">Link</a>';
            const result = sanitizeRichText(input);
            expect(result).toContain('href="https://example.com"');
        });

        it('strips javascript: hrefs', () => {
            const input = '<a href="javascript:alert(1)">Click</a>';
            const result = sanitizeRichText(input);
            expect(result).not.toContain('javascript:');
        });
    });

    // ── sanitizePlainText() ──

    describe('sanitizePlainText()', () => {
        it('strips all HTML tags', () => {
            expect(sanitizePlainText('<b>Bold</b> text')).toBe('Bold text');
        });

        it('preserves plain text content', () => {
            expect(sanitizePlainText('Hello world')).toBe('Hello world');
        });

        it('handles empty input', () => {
            expect(sanitizePlainText('')).toBe('');
        });
    });

    // ── sanitizeUrl() ──

    describe('sanitizeUrl()', () => {
        it('allows https URLs', () => {
            expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
        });

        it('allows http URLs', () => {
            expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
        });

        it('allows relative paths', () => {
            expect(sanitizeUrl('/images/photo.png')).toBe('/images/photo.png');
        });

        it('blocks javascript: protocol', () => {
            expect(sanitizeUrl('javascript:alert(1)')).toBe('');
        });

        it('blocks data: protocol', () => {
            expect(sanitizeUrl('data:text/html,<h1>Hi</h1>')).toBe('');
        });

        it('blocks vbscript: protocol', () => {
            expect(sanitizeUrl('vbscript:msgbox("hi")')).toBe('');
        });

        it('rejects ftp: URLs (not in allowlist)', () => {
            expect(sanitizeUrl('ftp://example.com')).toBe('');
        });

        it('handles empty input', () => {
            expect(sanitizeUrl('')).toBe('');
        });
    });

    // ── sanitizeEmail() ──

    describe('sanitizeEmail()', () => {
        it('accepts valid emails', () => {
            expect(sanitizeEmail('user@example.com')).toBe('user@example.com');
        });

        it('lowercases emails', () => {
            expect(sanitizeEmail('User@Example.COM')).toBe('user@example.com');
        });

        it('trims whitespace', () => {
            expect(sanitizeEmail('  user@example.com  ')).toBe('user@example.com');
        });

        it('rejects obviously invalid emails', () => {
            expect(sanitizeEmail('not-an-email')).toBe('');
            expect(sanitizeEmail('@missing-local.com')).toBe('');
        });

        it('handles empty input', () => {
            expect(sanitizeEmail('')).toBe('');
        });
    });

    // ── escapeHtml() ──

    describe('escapeHtml()', () => {
        it('escapes angle brackets', () => {
            expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
        });

        it('escapes ampersands', () => {
            expect(escapeHtml('A & B')).toBe('A &amp; B');
        });

        it('escapes quotes', () => {
            expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
        });

        it('handles empty input', () => {
            expect(escapeHtml('')).toBe('');
        });
    });

    // ── truncateText() ──

    describe('truncateText()', () => {
        it('returns full text if under max length', () => {
            expect(truncateText('Hello', 10)).toBe('Hello');
        });

        it('truncates and adds ellipsis for long text', () => {
            expect(truncateText('Hello World', 5)).toBe('Hello...');
        });

        it('handles empty input', () => {
            expect(truncateText('', 10)).toBe('');
        });
    });

    // ── sanitizeObject() ──

    describe('sanitizeObject()', () => {
        it('sanitizes multiple fields according to config', () => {
            const obj = {
                title: '<b>Bold Title</b>',
                bio: '<script>alert(1)</script>Safe text',
                website: 'https://example.com',
                password: 'secret123',
            };

            const result = sanitizeObject(obj, {
                title: 'plainText',
                bio: 'richText',
                website: 'url',
                password: 'skip',
            });

            expect(result.title).toBe('Bold Title');
            expect(result.bio).not.toContain('<script>');
            expect(result.website).toBe('https://example.com');
            expect(result.password).toBe('secret123'); // untouched
        });
    });
});
