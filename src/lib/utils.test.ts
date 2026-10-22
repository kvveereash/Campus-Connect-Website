
import { authHref, cn, safeRedirectPath } from './utils';

describe('cn utility', () => {
    it('should merge class names correctly', () => {
        const result = cn('c1', 'c2');
        expect(result).toBe('c1 c2');
    });

    it('should handle conditional classes', () => {
        const result = cn('c1', true && 'c2', false && 'c3');
        expect(result).toBe('c1 c2');
    });

    it('should merge tailwind classes correctly', () => {
        // twMerge should override conflicting classes
        // p-4 (padding 1rem) and p-2 (padding 0.5rem) -> p-2 should win if it's last
        const result = cn('p-4', 'p-2');
        expect(result).toBe('p-2');
    });
});

describe('safeRedirectPath', () => {
    const origin = 'https://campus.example';

    it.each([
        ['/events/42?tab=info', '/events/42?tab=info'],
        ['/profile#badges', '/profile#badges'],
    ])('keeps the same-site path %s', (value, expected) => {
        expect(safeRedirectPath(value, origin)).toBe(expected);
    });

    it.each([
        '//evil.com',
        '/\\evil.com',
        '\\\\evil.com',
        'https://evil.com/profile',
        'javascript:alert(1)',
        '/\t/evil.com',
        '/.//evil.com',
        '/%2e//evil.com',
        'https://campus.example//evil.com',
    ])('rejects %s', (value) => {
        expect(safeRedirectPath(value, origin)).toBe('/profile');
    });

    it('falls back when there is no value', () => {
        expect(safeRedirectPath(null, origin)).toBe('/profile');
    });

    it('uses the fallback it is given', () => {
        expect(safeRedirectPath(null, origin, '/events')).toBe('/events');
    });
});

describe('authHref', () => {
    it('points sign-in back at the page the visitor came from', () => {
        expect(authHref('/events/abc')).toBe('/login?redirect=%2Fevents%2Fabc');
    });

    it('builds the sign-up link the same way', () => {
        expect(authHref('/events/abc', '/signup')).toBe('/signup?redirect=%2Fevents%2Fabc');
    });

    it('encodes a query string so it survives the round trip', () => {
        const href = authHref('/events?category=Sports&when=week');
        expect(new URLSearchParams(href.split('?')[1]).get('redirect')).toBe('/events?category=Sports&when=week');
    });

    it('leaves the link plain when there is nowhere to return to', () => {
        expect(authHref(null, '/signup')).toBe('/signup');
    });
});
