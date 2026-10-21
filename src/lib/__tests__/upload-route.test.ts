/**
 * @jest-environment node
 */

const mockGetSession = jest.fn();
const mockCheckRateLimit = jest.fn();
const mockWriteFile = jest.fn();

jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }));
jest.mock('@/lib/rate-limit', () => ({
    uploadLimiter: {},
    getRateLimitIdentifier: (id: string) => `user:${id}`,
    checkRateLimit: (...a: unknown[]) => mockCheckRateLimit(...a),
}));
jest.mock('fs/promises', () => ({
    mkdir: jest.fn(async () => undefined),
    writeFile: (...a: unknown[]) => mockWriteFile(...a),
}));

import type { NextRequest } from 'next/server';
import { POST } from '@/app/api/upload/route';

const env = process.env as Record<string, string | undefined>;
const saved = { ...env };
const fetchMock = jest.fn();

function upload(file: File | null): NextRequest {
    const form = new FormData();
    if (file) form.set('file', file);
    return { formData: async () => form, headers: new Headers() } as unknown as NextRequest;
}

const png = () => new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0])], 'photo.png', { type: 'image/png' });

function configureStorage() {
    env.SUPABASE_URL = 'https://abc.supabase.co/';
    env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    env.SUPABASE_STORAGE_BUCKET = 'uploads';
}

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = fetchMock as unknown as typeof fetch;
    delete env.SUPABASE_URL;
    delete env.SUPABASE_SERVICE_ROLE_KEY;
    delete env.SUPABASE_STORAGE_BUCKET;
    env.NODE_ENV = 'test';
    mockGetSession.mockResolvedValue({ userId: 'me' });
    mockCheckRateLimit.mockResolvedValue({ success: true });
});

afterAll(() => {
    Object.assign(env, saved);
});

describe('POST /api/upload with Supabase Storage', () => {
    it('stores the file under a server-chosen name and returns its public URL', async () => {
        configureStorage();
        fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));

        const res = await POST(upload(png()));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.url).toMatch(/^https:\/\/abc\.supabase\.co\/storage\/v1\/object\/public\/uploads\/\d+-[0-9a-f-]+\.png$/);

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toMatch(/^https:\/\/abc\.supabase\.co\/storage\/v1\/object\/uploads\/\d+-[0-9a-f-]+\.png$/);
        expect(url).not.toContain('photo');
        expect(init.method).toBe('POST');
        expect(init.headers['Content-Type']).toBe('image/png');
        expect(init.headers.Authorization).toBe('Bearer service-role-key');
        expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('answers 502 without leaking the storage error when the upload fails', async () => {
        configureStorage();
        fetchMock.mockResolvedValue(new Response('{"error":"Bucket not found"}', { status: 404 }));

        const res = await POST(upload(png()));
        const body = await res.json();

        expect(res.status).toBe(502);
        expect(JSON.stringify(body)).not.toContain('Bucket');
    });
});

describe('POST /api/upload without storage', () => {
    it('refuses in production with a clear 503 instead of writing to disk', async () => {
        env.NODE_ENV = 'production';
        const res = await POST(upload(png()));
        expect(res.status).toBe(503);
        expect(mockWriteFile).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('writes to public/uploads in development', async () => {
        env.NODE_ENV = 'development';
        const res = await POST(upload(png()));
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.url).toMatch(/^\/uploads\/\d+-[0-9a-f-]+\.png$/);
        expect(mockWriteFile).toHaveBeenCalledTimes(1);
    });
});

describe('POST /api/upload validation', () => {
    it('requires a session', async () => {
        mockGetSession.mockResolvedValue(null);
        expect((await POST(upload(png()))).status).toBe(401);
    });

    it('rejects types outside the allowlist', async () => {
        configureStorage();
        const svg = new File(['<svg onload="alert(1)"/>'], 'x.svg', { type: 'image/svg+xml' });
        expect((await POST(upload(svg))).status).toBe(400);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects files over 5MB', async () => {
        configureStorage();
        const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' });
        expect((await POST(upload(big))).status).toBe(413);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects content that does not match its claimed type', async () => {
        configureStorage();
        const fake = new File(['<html><script>alert(1)</script></html>'], 'x.png', { type: 'image/png' });
        expect((await POST(upload(fake))).status).toBe(400);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects a missing file', async () => {
        expect((await POST(upload(null))).status).toBe(400);
    });
});
