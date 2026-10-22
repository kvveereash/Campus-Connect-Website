
import { safeRedirectPath } from './utils';

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
});
