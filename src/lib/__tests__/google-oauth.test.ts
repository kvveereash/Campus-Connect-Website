/**
 * @jest-environment node
 */

/* jose ships as ESM only, which this Jest setup does not transform; token
   verification needs Google's live keys anyway, so it is not exercised here. */
jest.mock('jose', () => ({ createRemoteJWKSet: jest.fn(), jwtVerify: jest.fn() }));
// Cost 12 bcrypt is a quarter of a second per call; the hash itself is not under test.
jest.mock('bcryptjs', () => ({ __esModule: true, default: { hash: jest.fn(async () => '$2b$12$unusable') } }));

const mockFindUnique = jest.fn();
const mockFindFirst = jest.fn();
const mockUpdate = jest.fn();
const mockCreate = jest.fn();
jest.mock('@/lib/db', () => ({
    __esModule: true,
    default: {
        user: {
            findUnique: (...a: unknown[]) => mockFindUnique(...a),
            findFirst: (...a: unknown[]) => mockFindFirst(...a),
            update: (...a: unknown[]) => mockUpdate(...a),
            create: (...a: unknown[]) => mockCreate(...a),
        },
    },
}));

import { createHash } from 'node:crypto';
import {
    codeChallengeFor,
    createGoogleFlow,
    decodeGoogleFlow,
    encodeGoogleFlow,
    googleAuthorizationUrl,
    googleConfigured,
    googleRedirectUri,
    requestOrigin,
    resolveGoogleAccount,
    sameState,
    type GoogleProfile,
} from '../google-oauth';
import { DEMO_EMAIL } from '../demo-account';

const BASE64URL = /^[A-Za-z0-9_-]+$/;
const NOW = new Date('2026-10-27T10:00:00Z');

const profile = (overrides: Partial<GoogleProfile> = {}): GoogleProfile => ({
    sub: 'google-123',
    email: 'Asha@Example.com',
    emailVerified: true,
    name: 'Asha Rao',
    picture: 'https://lh3.googleusercontent.com/a/photo',
    ...overrides,
});

const row = (overrides: Record<string, unknown> = {}) => ({
    id: 'user-1',
    name: 'Asha Rao',
    email: 'asha@example.com',
    role: 'USER',
    password: '$2b$12$existing',
    googleId: null,
    emailVerified: null,
    lockedUntil: null,
    deletedAt: null,
    ...overrides,
});

beforeEach(() => {
    jest.clearAllMocks();
    mockFindUnique.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(null);
});

describe('googleConfigured', () => {
    const env = process.env as Record<string, string | undefined>;
    const saved = { id: env.GOOGLE_CLIENT_ID, secret: env.GOOGLE_CLIENT_SECRET };
    // Assigning undefined to process.env stores the string "undefined", so unset by deleting.
    const restore = (key: string, value: string | undefined) => {
        if (value === undefined) delete env[key];
        else env[key] = value;
    };
    afterEach(() => {
        restore('GOOGLE_CLIENT_ID', saved.id);
        restore('GOOGLE_CLIENT_SECRET', saved.secret);
    });

    it('needs both the client id and the secret', () => {
        env.GOOGLE_CLIENT_ID = 'id.apps.googleusercontent.com';
        delete env.GOOGLE_CLIENT_SECRET;
        expect(googleConfigured()).toBe(false);
        env.GOOGLE_CLIENT_SECRET = 'secret';
        expect(googleConfigured()).toBe(true);
        env.GOOGLE_CLIENT_ID = '';
        expect(googleConfigured()).toBe(false);
    });
});

describe('the flow kept in the cookie', () => {
    it('makes a fresh, URL-safe state, nonce and verifier each time', () => {
        const a = createGoogleFlow('/events/1');
        const b = createGoogleFlow('/events/1');
        for (const value of [a.state, a.nonce, a.codeVerifier]) {
            expect(value).toMatch(BASE64URL);
            expect(value.length).toBeGreaterThanOrEqual(43);
        }
        expect(a.codeVerifier.length).toBeLessThanOrEqual(128);
        expect(a.state).not.toBe(b.state);
        expect(a.codeVerifier).not.toBe(b.codeVerifier);
        expect(a.returnTo).toBe('/events/1');
    });

    it('derives the S256 challenge as base64url SHA-256 of the verifier', () => {
        // The worked example from RFC 7636, appendix B.
        expect(codeChallengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
            'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        );
        const { codeVerifier } = createGoogleFlow('');
        expect(codeChallengeFor(codeVerifier)).toBe(createHash('sha256').update(codeVerifier).digest('base64url'));
    });

    it('reads back what it wrote', () => {
        const flow = createGoogleFlow('/clubs/9');
        expect(decodeGoogleFlow(encodeGoogleFlow(flow))).toEqual(flow);
    });

    it.each([
        undefined,
        '',
        'not-base64-json',
        Buffer.from('"just a string"').toString('base64url'),
        Buffer.from(JSON.stringify({ state: 's', nonce: 'n', codeVerifier: 'short' })).toString('base64url'),
        Buffer.from(JSON.stringify({ nonce: 'n', codeVerifier: 'v'.repeat(43) })).toString('base64url'),
        'x'.repeat(4000),
    ])('refuses a cookie it did not write: %p', (value) => {
        expect(decodeGoogleFlow(value)).toBeNull();
    });

    it('matches state only when it is exactly the same', () => {
        expect(sameState('abc', 'abc')).toBe(true);
        expect(sameState('abc', 'abd')).toBe(false);
        expect(sameState('abc', 'abcd')).toBe(false);
        expect(sameState(null, 'abc')).toBe(false);
        expect(sameState('', '')).toBe(false);
    });
});

describe('the address sent to Google', () => {
    it('asks for the code flow with PKCE, the basic scopes and an account picker', () => {
        const flow = createGoogleFlow('');
        const url = new URL(googleAuthorizationUrl(flow, 'https://campusconnect2026.netlify.app/api/auth/google/callback', 'client-1'));
        expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
        const p = url.searchParams;
        expect(p.get('client_id')).toBe('client-1');
        expect(p.get('redirect_uri')).toBe('https://campusconnect2026.netlify.app/api/auth/google/callback');
        expect(p.get('response_type')).toBe('code');
        expect(p.get('scope')).toBe('openid email profile');
        expect(p.get('state')).toBe(flow.state);
        expect(p.get('nonce')).toBe(flow.nonce);
        expect(p.get('code_challenge')).toBe(codeChallengeFor(flow.codeVerifier));
        expect(p.get('code_challenge_method')).toBe('S256');
        expect(p.get('prompt')).toBe('select_account');
        // The verifier is the secret half; it must never leave the server.
        expect(url.toString()).not.toContain(flow.codeVerifier);
    });

    it('builds the callback from the public origin, not the function host', () => {
        const proxied = new Request('http://internal:3000/api/auth/google', {
            headers: { 'x-forwarded-host': 'campusconnect2026.netlify.app', 'x-forwarded-proto': 'https' },
        });
        expect(googleRedirectUri(requestOrigin(proxied))).toBe('https://campusconnect2026.netlify.app/api/auth/google/callback');
        const local = new Request('http://localhost:3000/api/auth/google');
        expect(googleRedirectUri(requestOrigin(local))).toBe('http://localhost:3000/api/auth/google/callback');
    });
});

describe('resolveGoogleAccount', () => {
    it('signs in the account already linked to this Google id', async () => {
        mockFindUnique.mockResolvedValue(row({ googleId: 'google-123' }));
        const decision = await resolveGoogleAccount(profile(), NOW);
        expect(decision).toEqual({
            outcome: 'signed-in',
            user: { id: 'user-1', name: 'Asha Rao', email: 'asha@example.com', role: 'USER', password: '$2b$12$existing' },
        });
        expect(mockFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { googleId: 'google-123' } }));
        expect(mockUpdate).not.toHaveBeenCalled();
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('links an email account, case-insensitively, and marks the address confirmed', async () => {
        mockFindFirst.mockResolvedValue(row());
        mockUpdate.mockResolvedValue(row({ googleId: 'google-123', emailVerified: NOW }));
        const decision = await resolveGoogleAccount(profile(), NOW);
        expect(decision.outcome).toBe('linked');
        expect(mockFindFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { email: { equals: 'asha@example.com', mode: 'insensitive' }, deletedAt: null },
            }),
        );
        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'user-1' }, data: { googleId: 'google-123', emailVerified: NOW } }),
        );
    });

    it('keeps the original confirmation date when linking an already confirmed address', async () => {
        const confirmed = new Date('2026-01-01T00:00:00Z');
        mockFindFirst.mockResolvedValue(row({ emailVerified: confirmed }));
        mockUpdate.mockResolvedValue(row({ googleId: 'google-123', emailVerified: confirmed }));
        await resolveGoogleAccount(profile(), NOW);
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { googleId: 'google-123' } }));
    });

    it('creates an account with no usable password, the Google id and a confirmed address', async () => {
        mockCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => row({ ...data, id: 'user-new' }));
        const decision = await resolveGoogleAccount(profile(), NOW);
        expect(decision.outcome).toBe('created');
        const { data } = mockCreate.mock.calls[0][0] as { data: Record<string, unknown> };
        expect(data).toMatchObject({
            name: 'Asha Rao',
            email: 'asha@example.com',
            googleId: 'google-123',
            emailVerified: NOW,
            avatar: 'https://lh3.googleusercontent.com/a/photo',
            password: '$2b$12$unusable',
        });
        expect(data).not.toHaveProperty('collegeId');
    });

    it('drops a photo that is not https and names a nameless account after the inbox', async () => {
        mockCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => row(data));
        await resolveGoogleAccount(profile({ name: undefined, picture: 'http://example.com/a.png' }), NOW);
        const { data } = mockCreate.mock.calls[0][0] as { data: Record<string, unknown> };
        expect(data.avatar).toBeNull();
        expect(data.name).toBe('asha');
    });

    it('strips markup from the name Google sends', async () => {
        mockCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => row(data));
        await resolveGoogleAccount(profile({ name: '<b>Asha</b> Rao' }), NOW);
        expect((mockCreate.mock.calls[0][0] as { data: { name: string } }).data.name).toBe('Asha Rao');
    });

    it('looks again when another tab created the account first', async () => {
        mockCreate.mockRejectedValueOnce(Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }));
        mockFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(row({ googleId: 'google-123' }));
        const decision = await resolveGoogleAccount(profile(), NOW);
        expect(decision.outcome).toBe('signed-in');
        expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('refuses an address Google has not confirmed, before touching the database', async () => {
        expect(await resolveGoogleAccount(profile({ emailVerified: false }), NOW)).toEqual({ outcome: 'refused', reason: 'unverified' });
        expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it('refuses the shared demo account, whatever the capitals', async () => {
        expect(await resolveGoogleAccount(profile({ email: DEMO_EMAIL.toUpperCase() }), NOW)).toEqual({
            outcome: 'refused',
            reason: 'demo',
        });
        expect(mockFindUnique).not.toHaveBeenCalled();
        expect(mockUpdate).not.toHaveBeenCalled();
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('refuses a deleted account linked to this Google id', async () => {
        mockFindUnique.mockResolvedValue(row({ googleId: 'google-123', deletedAt: new Date('2026-05-01') }));
        expect(await resolveGoogleAccount(profile(), NOW)).toEqual({ outcome: 'refused', reason: 'deleted' });
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('refuses an account locked until later, and allows one whose lock has passed', async () => {
        mockFindUnique.mockResolvedValue(row({ googleId: 'google-123', lockedUntil: new Date('2026-10-27T11:00:00Z') }));
        expect(await resolveGoogleAccount(profile(), NOW)).toEqual({ outcome: 'refused', reason: 'locked' });

        mockFindUnique.mockResolvedValue(row({ googleId: 'google-123', lockedUntil: new Date('2026-10-27T09:00:00Z') }));
        expect((await resolveGoogleAccount(profile(), NOW)).outcome).toBe('signed-in');
    });

    it('will not move an email account from one Google account to another', async () => {
        mockFindFirst.mockResolvedValue(row({ googleId: 'google-999' }));
        expect(await resolveGoogleAccount(profile(), NOW)).toEqual({ outcome: 'refused', reason: 'other-google' });
        expect(mockUpdate).not.toHaveBeenCalled();
    });
});
