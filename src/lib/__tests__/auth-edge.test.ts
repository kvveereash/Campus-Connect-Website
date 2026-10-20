/**
 * @jest-environment node
 */

jest.mock('next/headers', () => ({ cookies: jest.fn() }));

/* jose ships as ESM, which this Jest setup does not transform. The stand-in
   "signs" by embedding the key, which is all these tests need: they are about
   which key is used, not about HMAC. */
jest.mock('jose', () => {
    const decode = (key: Uint8Array) => new TextDecoder().decode(key);
    class SignJWT {
        constructor(private payload: Record<string, unknown>) {}
        setProtectedHeader() { return this; }
        setIssuedAt() { return this; }
        setExpirationTime() { return this; }
        async sign(key: Uint8Array) {
            return JSON.stringify({ payload: this.payload, key: decode(key) });
        }
    }
    async function jwtVerify(token: string, key: Uint8Array) {
        const parsed = JSON.parse(token);
        if (parsed.key !== decode(key)) throw new Error('signature verification failed');
        return { payload: parsed.payload };
    }
    return { SignJWT, jwtVerify };
});

const env = process.env as Record<string, string | undefined>;
const original = { NODE_ENV: env.NODE_ENV, JWT_SECRET: env.JWT_SECRET };

function loadAuthEdge(): typeof import('../auth-edge') {
    let mod!: typeof import('../auth-edge');
    jest.isolateModules(() => {
        mod = require('../auth-edge');
    });
    return mod;
}

afterEach(() => {
    env.NODE_ENV = original.NODE_ENV;
    env.JWT_SECRET = original.JWT_SECRET;
});

describe('JWT signing key', () => {
    it('refuses to sign in production without JWT_SECRET', async () => {
        env.NODE_ENV = 'production';
        delete env.JWT_SECRET;
        await expect(loadAuthEdge().encrypt({ userId: 'u' })).rejects.toThrow(/JWT_SECRET/);
    });

    it('refuses a short JWT_SECRET in production', async () => {
        env.NODE_ENV = 'production';
        env.JWT_SECRET = 'too-short';
        await expect(loadAuthEdge().encrypt({ userId: 'u' })).rejects.toThrow(/32 characters/);
    });

    it('signs and verifies with a long enough secret in production', async () => {
        env.NODE_ENV = 'production';
        env.JWT_SECRET = 'x'.repeat(32);
        const { encrypt, decrypt } = loadAuthEdge();
        const token = await encrypt({ userId: 'u' });
        await expect(decrypt(token)).resolves.toMatchObject({ userId: 'u' });
    });

    it('does not accept a token signed with the old public fallback in production', async () => {
        env.NODE_ENV = 'development';
        delete env.JWT_SECRET;
        const forged = await loadAuthEdge().encrypt({ userId: 'admin', role: 'ADMIN' });

        env.NODE_ENV = 'production';
        env.JWT_SECRET = 'a-real-secret-that-is-long-enough-1234';
        await expect(loadAuthEdge().decrypt(forged)).rejects.toThrow();
    });
});
