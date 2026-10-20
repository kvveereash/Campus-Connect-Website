
import { cn, safeRedirectPath } from './utils';

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
    ])('rejects %s', (value) => {
        expect(safeRedirectPath(value, origin)).toBe('/profile');
    });

    it('falls back when there is no value', () => {
        expect(safeRedirectPath(null, origin)).toBe('/profile');
    });
});
