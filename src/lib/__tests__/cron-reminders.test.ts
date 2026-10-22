/**
 * @jest-environment node
 */

const mockFindEvents = jest.fn();
const mockFindNotifications = jest.fn();
const mockCreateMany = jest.fn();
const mockQueryRaw = jest.fn();
const mockSendEmail = jest.fn();

const tx = {
    $queryRaw: (...a: unknown[]) => mockQueryRaw(...a),
    notification: {
        findMany: (...a: unknown[]) => mockFindNotifications(...a),
        createMany: (...a: unknown[]) => mockCreateMany(...a),
    },
};

jest.mock('@/lib/db', () => ({
    __esModule: true,
    default: {
        event: { findMany: (...a: unknown[]) => mockFindEvents(...a) },
        $transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
    },
}));
jest.mock('@/lib/email', () => ({ sendEmail: (...a: unknown[]) => mockSendEmail(...a) }));
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('@/lib/ticket', () => ({ GOING: ['PAID', 'COMPLETED'] }));

import { POST } from '@/app/api/cron/reminders/route';

const env = process.env as Record<string, string | undefined>;
const SECRET = 'cron-secret-long-enough';
const call = (auth?: string) =>
    POST(new Request('http://x/api/cron/reminders', { method: 'POST', headers: auth ? { authorization: auth } : {} }));

beforeEach(() => {
    jest.clearAllMocks();
    env.CRON_SECRET = SECRET;
    mockFindEvents.mockResolvedValue([
        {
            id: 'ev1',
            title: 'Hack the Monsoon',
            date: new Date(Date.now() + 3 * 60 * 60 * 1000),
            venue: 'Hall A',
            registrations: [
                { userId: 'u1', user: { email: 'u1@x.in', name: 'One' } },
                { userId: 'u2', user: { email: 'u2@x.in', name: 'Two' } },
            ],
        },
    ]);
    mockQueryRaw.mockResolvedValue([{ locked: '' }]);
    mockCreateMany.mockResolvedValue({ count: 1 });
    mockSendEmail.mockResolvedValue(undefined);
});

afterAll(() => {
    delete env.CRON_SECRET;
});

describe('POST /api/cron/reminders', () => {
    it('refuses without the secret', async () => {
        expect((await call()).status).toBe(401);
        expect((await call('Bearer wrong-secret-of-same-len')).status).toBe(401);
        expect(mockFindEvents).not.toHaveBeenCalled();
    });

    it('locks the event, skips people already reminded, and emails only the new ones', async () => {
        mockFindNotifications.mockResolvedValue([{ recipientId: 'u1' }]);

        const res = await call(`Bearer ${SECRET}`);
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ events: 1, reminders: 1 });

        // The lock is taken before the check, inside the same transaction.
        expect(mockQueryRaw).toHaveBeenCalledTimes(1);
        expect(mockQueryRaw.mock.invocationCallOrder[0]).toBeLessThan(mockFindNotifications.mock.invocationCallOrder[0]);

        expect(mockCreateMany).toHaveBeenCalledWith({
            data: [expect.objectContaining({ recipientId: 'u2', type: 'EVENT_REMINDER', link: '/events/ev1' })],
        });
        expect(mockSendEmail).toHaveBeenCalledTimes(1);
        expect(mockSendEmail.mock.calls[0][0].to).toBe('u2@x.in');
    });

    it('sends nothing when everyone has been reminded', async () => {
        mockFindNotifications.mockResolvedValue([{ recipientId: 'u1' }, { recipientId: 'u2' }]);
        const res = await call(`Bearer ${SECRET}`);
        expect(await res.json()).toEqual({ events: 1, reminders: 0 });
        expect(mockCreateMany).not.toHaveBeenCalled();
        expect(mockSendEmail).not.toHaveBeenCalled();
    });
});
