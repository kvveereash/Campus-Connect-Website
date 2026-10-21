/**
 * @jest-environment node
 */

const mockCookieGet = jest.fn();
const mockDecrypt = jest.fn();
const mockFindUnique = jest.fn();
const mockFindFirst = jest.fn();
const mockCreate = jest.fn();
const mockCheckRateLimit = jest.fn();

jest.mock('next/headers', () => ({
    cookies: async () => ({ get: (...a: unknown[]) => mockCookieGet(...a), set: jest.fn(), delete: jest.fn() }),
    headers: async () => new Headers(),
}));
jest.mock('@/lib/auth-edge', () => ({
    decrypt: (...a: unknown[]) => mockDecrypt(...a),
    createSession: jest.fn(),
    deleteSession: jest.fn(),
}));
jest.mock('@/lib/db', () => ({
    __esModule: true,
    default: {
        user: {
            findUnique: (...a: unknown[]) => mockFindUnique(...a),
            findFirst: (...a: unknown[]) => mockFindFirst(...a),
            create: (...a: unknown[]) => mockCreate(...a),
        },
        college: { findFirst: jest.fn() },
        loginAttempt: { create: jest.fn(async () => ({})) },
    },
}));
jest.mock('@/lib/rate-limit', () => ({
    authLimiter: {}, signupLimiter: {}, loginIpLimiter: {}, signupIpLimiter: {},
    getClientIp: async () => '203.0.113.7',
    getRateLimitIdentifier: (u?: string, ip?: string) => (u ? `user:${u}` : ip ? `ip:${ip}` : 'anonymous'),
    checkRateLimit: (...a: unknown[]) => mockCheckRateLimit(...a),
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn(), updateTag: jest.fn() }));

import { getSession, passwordVersion } from '../auth';
import { login, signup } from '../actions/auth';

const form = (fields: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(fields)) f.set(k, v);
    return f;
};

beforeEach(() => {
    jest.clearAllMocks();
    mockCookieGet.mockReturnValue({ value: 'token' });
    mockCheckRateLimit.mockResolvedValue({ success: true, reset: new Date() });
});

describe('sessions end when the password changes', () => {
    const user = { id: 'u1', name: 'A', email: 'a@x.edu', role: 'USER', avatar: null, collegeId: 'c1', deletedAt: null, password: '$2b$12$old' };

    it('accepts a session minted with the current password', async () => {
        mockDecrypt.mockResolvedValue({ userId: 'u1', pv: passwordVersion(user.password) });
        mockFindUnique.mockResolvedValue(user);
        const session = await getSession();
        expect(session?.user.id).toBe('u1');
        expect(session?.user).not.toHaveProperty('password');
    });

    it('refuses a session minted before the password changed', async () => {
        mockDecrypt.mockResolvedValue({ userId: 'u1', pv: passwordVersion('$2b$12$previous') });
        mockFindUnique.mockResolvedValue(user);
        expect(await getSession()).toBeNull();
    });

    it('refuses an old-style session with no fingerprint', async () => {
        mockDecrypt.mockResolvedValue({ userId: 'u1' });
        mockFindUnique.mockResolvedValue(user);
        expect(await getSession()).toBeNull();
    });
});

describe('signup validation', () => {
    it('rejects a short password on the server', async () => {
        const result = await signup(null, form({ name: 'Ada Lovelace', email: 'ada@x.edu', password: 'a' }));
        expect(result.success).toBe(false);
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('rejects an oversized name', async () => {
        const result = await signup(null, form({ name: 'x'.repeat(5000), email: 'ada@x.edu', password: 'long-enough-1' }));
        expect(result.success).toBe(false);
        expect(mockCreate).not.toHaveBeenCalled();
    });
});

describe('login limits', () => {
    it('keys the per-account limit on IP and address, plus a per-IP limit', async () => {
        mockFindFirst.mockResolvedValue(null);
        await login(null, form({ email: 'Victim@X.edu', password: 'wrong-password' }));
        const keys = mockCheckRateLimit.mock.calls.map((c) => c[1]);
        expect(keys).toEqual(expect.arrayContaining(['ip:203.0.113.7', 'ip:203.0.113.7:email:victim@x.edu']));
    });

    it('answers an unknown address like a wrong password', async () => {
        mockFindFirst.mockResolvedValue(null);
        const result = await login(null, form({ email: 'nobody@x.edu', password: 'whatever-123' }));
        expect(result).toEqual({ success: false, error: 'Invalid credentials' });
    });
});
