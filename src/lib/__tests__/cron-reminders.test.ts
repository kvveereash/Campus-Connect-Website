/**
 * @jest-environment node
 */

const mockFindEvents = jest.fn();
const mockClaim = jest.fn();
const mockFindUsers = jest.fn();
const mockCreateMany = jest.fn();
const mockSendEmail = jest.fn();

jest.mock('@/lib/db', () => ({
    __esModule: true,
    default: {
        event: { findMany: (...a: unknown[]) => mockFindEvents(...a) },
        // The claim: UPDATE ... SET "reminderSentAt" ... RETURNING "userId".
        $queryRaw: (...a: unknown[]) => mockClaim(...a),
        user: { findMany: (...a: unknown[]) => mockFindUsers(...a) },
        notification: { createMany: (...a: unknown[]) => mockCreateMany(...a) },
    },
}));
jest.mock('@/lib/email', () => ({ sendEmail: (...a: unknown[]) => mockSendEmail(...a) }));
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

import { POST } from '@/app/api/cron/reminders/route';

const env = process.env as Record<string, string | undefined>;
const SECRET = 'cron-secret-long-enough';
const call = (auth?: string) =>
    POST(new Request('http://x/api/cron/reminders', { method: 'POST', headers: auth ? { authorization: auth } : {} }));

const USERS = {
    u1: { id: 'u1', email: 'u1@x.in', name: 'One' },
    u2: { id: 'u2', email: 'u2@x.in', name: 'Two' },
};

beforeEach(() => {
    jest.clearAllMocks();
    env.CRON_SECRET = SECRET;
    mockFindEvents.mockResolvedValue([
        { id: 'ev1', title: 'Hack the Monsoon', date: new Date(Date.now() + 3 * 60 * 60 * 1000), venue: 'Hall A' },
    ]);
    mockFindUsers.mockImplementation(({ where }: { where: { id: { in: (keyof typeof USERS)[] } } }) =>
        Promise.resolve(where.id.in.map((id) => USERS[id])),
    );
    mockCreateMany.mockResolvedValue({ count: 1 });
    mockSendEmail.mockResolvedValue(undefined);
});

afterAll(() => {
    delete env.CRON_SECRET;
});

describe('POST /api/cron/reminders', () => {
    it('is off without CRON_SECRET, and refuses a wrong one', async () => {
        delete env.CRON_SECRET;
        expect((await call(`Bearer ${SECRET}`)).status).toBe(503);
        env.CRON_SECRET = SECRET;
        expect((await call()).status).toBe(401);
        expect((await call('Bearer wrong-secret-of-same-len')).status).toBe(401);
        expect(mockFindEvents).not.toHaveBeenCalled();
    });

    it('reminds and emails exactly the registrations this run claimed', async () => {
        mockClaim.mockResolvedValue([{ userId: 'u2' }]);

        const res = await call(`Bearer ${SECRET}`);
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ events: 1, reminders: 1 });

        expect(mockCreateMany).toHaveBeenCalledWith({
            data: [expect.objectContaining({ recipientId: 'u2', type: 'EVENT_REMINDER', link: '/events/ev1' })],
        });
        expect(mockSendEmail).toHaveBeenCalledTimes(1);
        expect(mockSendEmail.mock.calls[0][0].to).toBe('u2@x.in');
    });

    it('claims only unreminded, going registrations, in the statement itself', async () => {
        mockClaim.mockResolvedValue([]);
        await call(`Bearer ${SECRET}`);
        const sql = (mockClaim.mock.calls[0][0] as TemplateStringsArray).join('?');
        expect(sql).toMatch(/UPDATE "EventRegistration"/);
        expect(sql).toMatch(/"reminderSentAt" IS NULL/);
        expect(sql).toMatch(/"status" IN \('PAID', 'COMPLETED'\)/);
        expect(sql).toMatch(/RETURNING "userId"/);
    });

    it('sends nothing twice when two runs overlap: the second claims no one', async () => {
        // The database hands each registration to one UPDATE only.
        mockClaim.mockResolvedValueOnce([{ userId: 'u1' }, { userId: 'u2' }]).mockResolvedValueOnce([]);

        const [first, second] = await Promise.all([call(`Bearer ${SECRET}`), call(`Bearer ${SECRET}`)]);
        const totals = [await first.json(), await second.json()].map((r) => r.reminders);
        expect(totals.sort()).toEqual([0, 2]);
        expect(mockCreateMany).toHaveBeenCalledTimes(1);
        expect(mockSendEmail).toHaveBeenCalledTimes(2);
    });
});
