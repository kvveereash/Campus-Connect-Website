/**
 * @jest-environment node
 */

const mockSend = jest.fn();
const mockGetSession = jest.fn();
const mockDb = {
    pushSubscription: { findMany: jest.fn(), deleteMany: jest.fn(), upsert: jest.fn() },
};

jest.mock('web-push', () => ({
    __esModule: true,
    default: { sendNotification: (...a: unknown[]) => mockSend(...a) },
}));
// A getter, because the imports below are hoisted above mockDb's initialiser.
jest.mock('@/lib/db', () => ({ __esModule: true, get default() { return mockDb; } }));
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }));
jest.mock('@/lib/rate-limit', () => ({
    pushSubscribeLimiter: undefined,
    checkRateLimit: jest.fn(async () => ({ success: true })),
    getRateLimitIdentifier: jest.fn(async () => 'test'),
}));

import { pushEnabled, sendPush } from '../push';
import { savePushSubscription, removePushSubscription } from '../actions/push';
import { DEMO_EMAIL } from '../demo-account';

const env = process.env as Record<string, string | undefined>;
const KEYS = ['NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT'] as const;
const MESSAGE = { title: 'Campus Connect', body: 'Asha replied to your post.', url: '/buzz/p1' };

const SUBS = [
    { endpoint: 'https://push.example/a', p256dh: 'pa', auth: 'aa' },
    { endpoint: 'https://push.example/b', p256dh: 'pb', auth: 'ab' },
];

function setKeys() {
    env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'public-key';
    env.VAPID_PRIVATE_KEY = 'private-key';
    env.VAPID_SUBJECT = 'mailto:owner@example.com';
}

beforeEach(() => {
    jest.clearAllMocks();
    setKeys();
    mockDb.pushSubscription.findMany.mockResolvedValue(SUBS);
    mockDb.pushSubscription.deleteMany.mockResolvedValue({ count: 0 });
    mockSend.mockResolvedValue({ statusCode: 201 });
    mockGetSession.mockResolvedValue({
        userId: 'me',
        user: { id: 'me', name: 'Me', email: 'me@x.edu', role: 'USER', avatar: null },
    });
});

afterAll(() => {
    for (const key of KEYS) delete env[key];
});

describe('sendPush', () => {
    it('is off unless every VAPID value is set', async () => {
        for (const key of KEYS) {
            setKeys();
            delete env[key];
            expect(pushEnabled()).toBe(false);
            await sendPush(['u1'], MESSAGE);
        }
        expect(mockDb.pushSubscription.findMany).not.toHaveBeenCalled();
        expect(mockSend).not.toHaveBeenCalled();
    });

    it('sends to each of the users’ devices, selecting only what it needs', async () => {
        await sendPush(['u1', 'u1', 'u2'], MESSAGE);

        expect(mockDb.pushSubscription.findMany).toHaveBeenCalledWith({
            where: { userId: { in: ['u1', 'u2'] } },
            select: { endpoint: true, p256dh: true, auth: true },
        });
        expect(mockSend).toHaveBeenCalledTimes(2);
        const [subscription, payload, options] = mockSend.mock.calls[0];
        expect(subscription).toEqual({ endpoint: 'https://push.example/a', keys: { p256dh: 'pa', auth: 'aa' } });
        expect(JSON.parse(payload)).toEqual(MESSAGE);
        expect(options).toEqual(expect.objectContaining({ TTL: 86400, urgency: 'normal' }));
        expect(mockDb.pushSubscription.deleteMany).not.toHaveBeenCalled();
    });

    it('never links off the site', async () => {
        await sendPush(['u1'], { ...MESSAGE, url: 'https://evil.example/x' });
        expect(JSON.parse(mockSend.mock.calls[0][1]).url).toBe('/');
    });

    it('removes a device the push service says is gone', async () => {
        mockSend
            .mockRejectedValueOnce(Object.assign(new Error('Gone'), { statusCode: 410 }))
            .mockResolvedValueOnce({ statusCode: 201 });

        await sendPush(['u1'], MESSAGE);

        expect(mockDb.pushSubscription.deleteMany).toHaveBeenCalledWith({
            where: { endpoint: { in: ['https://push.example/a'] } },
        });
    });

    it('never throws, whether a send or the database fails', async () => {
        mockSend.mockRejectedValue(Object.assign(new Error('Server error'), { statusCode: 500 }));
        await expect(sendPush(['u1'], MESSAGE)).resolves.toBeUndefined();
        // A failure other than "gone" keeps the device.
        expect(mockDb.pushSubscription.deleteMany).not.toHaveBeenCalled();

        mockDb.pushSubscription.findMany.mockRejectedValue(new Error('connection lost'));
        await expect(sendPush(['u1'], MESSAGE)).resolves.toBeUndefined();
    });
});

describe('push subscription actions', () => {
    const valid = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'p', auth: 'a' } };

    it('refuses shapes that are not a push subscription', async () => {
        const bad: unknown[] = [
            { ...valid, endpoint: 'http://fcm.googleapis.com/fcm/send/abc' },
            { ...valid, endpoint: 'not a url' },
            { ...valid, endpoint: `https://push.example/${'x'.repeat(1000)}` },
            { ...valid, keys: { p256dh: '', auth: 'a' } },
            { endpoint: valid.endpoint },
            null,
        ];
        for (const input of bad) {
            const result = await savePushSubscription(input as typeof valid);
            expect(result.success).toBe(false);
        }
        expect(mockDb.pushSubscription.upsert).not.toHaveBeenCalled();
    });

    it('saves a valid subscription to the signed-in user, re-pointing an existing one', async () => {
        const result = await savePushSubscription(valid);
        expect(result.success).toBe(true);
        expect(mockDb.pushSubscription.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { endpoint: valid.endpoint },
                update: expect.objectContaining({ userId: 'me' }),
                create: expect.objectContaining({ userId: 'me', p256dh: 'p', auth: 'a' }),
            }),
        );
    });

    it('refuses the shared demo account', async () => {
        mockGetSession.mockResolvedValue({
            userId: 'demo',
            user: { id: 'demo', name: 'Demo', email: DEMO_EMAIL, role: 'USER', avatar: null },
        });
        const result = await savePushSubscription(valid);
        expect(result.success).toBe(false);
        expect(mockDb.pushSubscription.upsert).not.toHaveBeenCalled();
    });

    it('removes only the caller’s own device', async () => {
        await removePushSubscription(valid.endpoint);
        expect(mockDb.pushSubscription.deleteMany).toHaveBeenCalledWith({
            where: { endpoint: valid.endpoint, userId: 'me' },
        });
    });
});
