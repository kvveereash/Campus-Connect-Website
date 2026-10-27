/**
 * @jest-environment node
 */

const mockFindUsers = jest.fn();
const mockClaim = jest.fn();
const mockUpdateUsers = jest.fn();
const mockFindRegistrations = jest.fn();
const mockFindSaves = jest.fn();
const mockFindEvents = jest.fn();
const mockSendEmail = jest.fn();
const mockEmailEnabled = jest.fn();

jest.mock('@/lib/db', () => ({
    __esModule: true,
    default: {
        user: {
            findMany: (...a: unknown[]) => mockFindUsers(...a),
            updateMany: (...a: unknown[]) => mockUpdateUsers(...a),
        },
        // The claim: UPDATE "User" SET "digestSentAt" ... RETURNING "id".
        $queryRaw: (...a: unknown[]) => mockClaim(...a),
        eventRegistration: { findMany: (...a: unknown[]) => mockFindRegistrations(...a) },
        eventInterest: { findMany: (...a: unknown[]) => mockFindSaves(...a) },
        event: { findMany: (...a: unknown[]) => mockFindEvents(...a) },
    },
}));
jest.mock('@/lib/email', () => ({
    sendEmail: (...a: unknown[]) => mockSendEmail(...a),
    emailEnabled: () => mockEmailEnabled(),
}));
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

import { buildDigestItems, categoriesForInterests, runDigestBatch, DIGEST_MAX_ITEMS, type DigestEvent, type DigestRecipient } from '@/lib/digest';
import { renderDigestEmail } from '@/lib/digest-email';
import { digestUnsubscribeToken } from '@/lib/ticket';
import { POST as unsubscribe } from '@/app/api/digest/unsubscribe/[token]/route';
import * as unsubscribeRoute from '@/app/api/digest/unsubscribe/[token]/route';

const env = process.env as Record<string, string | undefined>;
const NOW = new Date('2026-11-02T02:30:00Z'); // Monday 08:00 IST
const DAY = 24 * 60 * 60 * 1000;

let seq = 0;
function event(overrides: Partial<DigestEvent> = {}): DigestEvent {
    seq++;
    return {
        id: `ev${seq}`,
        title: `Event ${seq}`,
        date: new Date(NOW.getTime() + seq * 60 * 60 * 1000),
        venue: 'Hall A',
        category: 'Workshop',
        clubId: null,
        hostCollegeId: 'elsewhere',
        hostCollege: { name: 'Some College' },
        club: null,
        ...overrides,
    };
}

const person = (overrides: Partial<DigestRecipient> = {}): DigestRecipient => ({
    id: 'u1',
    name: 'Asha Rao',
    email: 'asha@x.in',
    collegeId: 'c1',
    followedCollegeIds: [],
    clubIds: [],
    interests: [],
    ...overrides,
});

const userRow = (id: string, email = `${id}@x.in`) => ({
    id,
    name: `Person ${id}`,
    email,
    collegeId: 'c1',
    followedColleges: [],
    clubMemberships: [],
    interests: [],
});

const sqlOf = (call: unknown[]) => (call[0] as TemplateStringsArray).join('?').replace(/\s+/g, ' ');

beforeEach(() => {
    jest.clearAllMocks();
    seq = 0;
    mockEmailEnabled.mockReturnValue(true);
    mockFindUsers.mockResolvedValue([]);
    mockClaim.mockResolvedValue([]);
    mockUpdateUsers.mockResolvedValue({ count: 0 });
    mockFindRegistrations.mockResolvedValue([]);
    mockFindSaves.mockResolvedValue([]);
    mockFindEvents.mockResolvedValue([]);
    mockSendEmail.mockResolvedValue({ success: true, id: 'mock' });
});

describe('who gets the digest', () => {
    it('asks only for opted-in, confirmed, live accounts not sent to in six days, and never the demo', async () => {
        await runDigestBatch(NOW);
        const { where, take, select } = mockFindUsers.mock.calls[0][0];
        expect(where).toMatchObject({
            weeklyDigest: true,
            emailVerified: { not: null },
            deletedAt: null,
            NOT: { email: { equals: 'demo@campusconnect.app', mode: 'insensitive' } },
        });
        expect(where.OR).toEqual([{ digestSentAt: null }, { digestSentAt: { lt: new Date(NOW.getTime() - 6 * DAY) } }]);
        expect(take).toBeGreaterThan(0);
        expect(take).toBeLessThanOrEqual(200);
        // Explicit fields only: no password or other private columns.
        expect(select.password).toBeUndefined();
    });

    it('drops the demo account even if the query let it through, before claiming', async () => {
        mockFindUsers.mockResolvedValue([userRow('demo', 'Demo@CampusConnect.app'), userRow('u1')]);
        mockClaim.mockResolvedValue([{ id: 'u1' }]);
        mockFindEvents.mockResolvedValue([event({ hostCollegeId: 'c1' })]);

        await runDigestBatch(NOW);

        const claimValues = mockClaim.mock.calls[0].slice(1);
        expect(JSON.stringify(claimValues)).not.toContain('demo');
        expect(mockSendEmail).toHaveBeenCalledTimes(1);
        expect(mockSendEmail.mock.calls[0][0].to).toBe('u1@x.in');
    });
});

describe('the claim', () => {
    it('is a conditional UPDATE ... RETURNING, and only people it returned are emailed', async () => {
        mockFindUsers.mockResolvedValue([userRow('u1'), userRow('u2')]);
        // Another run claimed u1 a moment ago.
        mockClaim.mockResolvedValue([{ id: 'u2' }]);
        mockFindEvents.mockResolvedValue([event({ hostCollegeId: 'c1' })]);

        const result = await runDigestBatch(NOW);

        const sql = sqlOf(mockClaim.mock.calls[0]);
        expect(sql).toContain('UPDATE "User"');
        expect(sql).toContain('"weeklyDigest" = true');
        expect(sql).toContain('"deletedAt" IS NULL');
        expect(sql).toContain('("digestSentAt" IS NULL OR "digestSentAt" < ?)');
        expect(sql).toContain('RETURNING "id"');

        expect(mockSendEmail).toHaveBeenCalledTimes(1);
        expect(mockSendEmail.mock.calls[0][0].to).toBe('u2@x.in');
        expect(result).toMatchObject({ claimed: 1, sent: 1 });
        // The week's events were read for the claimed person only.
        expect(mockFindRegistrations.mock.calls[0][0].where.userId).toEqual({ in: ['u2'] });
    });

    it('sends nothing when an overlapping run already claimed everyone', async () => {
        mockFindUsers.mockResolvedValue([userRow('u1')]);
        mockClaim.mockResolvedValue([]);

        const result = await runDigestBatch(NOW);

        expect(mockSendEmail).not.toHaveBeenCalled();
        expect(mockFindEvents).not.toHaveBeenCalled();
        expect(result).toMatchObject({ claimed: 0, sent: 0 });
    });

    it('hands the claim back if reading the week fails, so nobody loses their email', async () => {
        mockFindUsers.mockResolvedValue([userRow('u1')]);
        mockClaim.mockResolvedValue([{ id: 'u1' }]);
        mockFindEvents.mockRejectedValue(new Error('database went away'));

        await expect(runDigestBatch(NOW)).rejects.toThrow('database went away');
        expect(mockUpdateUsers).toHaveBeenCalledWith({
            where: { id: { in: ['u1'] }, digestSentAt: NOW },
            data: { digestSentAt: null },
        });
        expect(mockSendEmail).not.toHaveBeenCalled();
    });
});

describe('nothing is sent when it should not be', () => {
    it('sends nothing without a signing key for the unsubscribe link', async () => {
        const { NODE_ENV, TICKET_SECRET } = env;
        env.NODE_ENV = 'production';
        delete env.TICKET_SECRET;
        try {
            const result = await runDigestBatch(NOW);
            expect(result).toEqual({ skipped: expect.stringContaining('TICKET_SECRET') });
        } finally {
            env.NODE_ENV = NODE_ENV;
            env.TICKET_SECRET = TICKET_SECRET;
        }
        expect(mockFindUsers).not.toHaveBeenCalled();
        expect(mockClaim).not.toHaveBeenCalled();
        expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('claims nobody when email is off', async () => {
        mockEmailEnabled.mockReturnValue(false);
        const result = await runDigestBatch(NOW);
        expect(result).toEqual({ skipped: expect.stringContaining('RESEND_API_KEY') });
        expect(mockClaim).not.toHaveBeenCalled();
    });

    it('skips someone with nothing on this week, and keeps them claimed', async () => {
        mockFindUsers.mockResolvedValue([userRow('u1')]);
        mockClaim.mockResolvedValue([{ id: 'u1' }]);

        const result = await runDigestBatch(NOW);

        expect(mockSendEmail).not.toHaveBeenCalled();
        expect(mockUpdateUsers).not.toHaveBeenCalled();
        expect(result).toMatchObject({ claimed: 1, sent: 0, empty: 1, released: 0 });
    });

    it('carries a one-click unsubscribe link for exactly that person', async () => {
        mockFindUsers.mockResolvedValue([userRow('u1')]);
        mockClaim.mockResolvedValue([{ id: 'u1' }]);
        mockFindEvents.mockResolvedValue([event({ hostCollegeId: 'c1' })]);

        await runDigestBatch(NOW);

        const message = mockSendEmail.mock.calls[0][0];
        const token = digestUnsubscribeToken('u1');
        expect(token).toBeTruthy();
        const base = (env.NEXT_PUBLIC_APP_URL || 'https://campusconnect2026.netlify.app').replace(/\/+$/, '');
        expect(message.headers['List-Unsubscribe']).toBe(`<${base}/api/digest/unsubscribe/${token}>`);
        expect(message.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
        expect(message.html).toContain(`/digest/unsubscribe/${token}`);
        expect(message.text).toContain(`/digest/unsubscribe/${token}`);
    });
});

describe('what goes in it', () => {
    it('shows each event once, under its strongest reason', () => {
        const shared = event({ hostCollegeId: 'c1', clubId: 'club1', club: { name: 'Coding Club' } });
        const items = buildDigestItems(person({ clubIds: ['club1'] }), [shared], [shared], [shared]);
        expect(items).toHaveLength(1);
        expect(items[0]).toMatchObject({ id: shared.id, reason: 'You are going', going: true });
    });

    it('caps at eight, keeping what you are going to, then soonest first', () => {
        const later = event({ date: new Date(NOW.getTime() + 6 * DAY) });
        const pool = Array.from({ length: 12 }, () => event({ hostCollegeId: 'c1' }));
        const items = buildDigestItems(person(), [later], [], pool);

        expect(items).toHaveLength(DIGEST_MAX_ITEMS);
        expect(items[0]).toMatchObject({ id: later.id, going: true });
        const rest = items.slice(1).map((i) => i.date.getTime());
        expect(rest).toEqual([...rest].sort((a, b) => a - b));
        // The soonest of the pool made it in, the latest did not.
        expect(items.map((i) => i.id)).toContain(pool[0].id);
        expect(items.map((i) => i.id)).not.toContain(pool[11].id);
    });

    it('prefers your clubs and college over colleges you follow and interests when the cap bites', () => {
        const interestEvents = Array.from({ length: 6 }, () => event({ category: 'Technology' }));
        const followedEvents = Array.from({ length: 3 }, () => event({ hostCollegeId: 'f1' }));
        const collegeEvents = Array.from({ length: 3 }, () => event({ hostCollegeId: 'c1', date: new Date(NOW.getTime() + 5 * DAY) }));
        const items = buildDigestItems(
            person({ followedCollegeIds: ['f1'], interests: ['Coding'] }),
            [],
            [],
            [...interestEvents, ...followedEvents, ...collegeEvents],
        );
        const reasons = items.map((i) => i.reason);
        expect(reasons.filter((r) => r === 'At your college')).toHaveLength(3);
        expect(reasons.filter((r) => r === 'At a college you follow')).toHaveLength(3);
        expect(reasons.filter((r) => r.includes('close to your interest in Coding'))).toHaveLength(2);
    });

    it('ignores events nobody has a reason to see', () => {
        expect(buildDigestItems(person(), [], [], [event(), event()])).toEqual([]);
    });

    it('maps interests to categories by whole words only', () => {
        expect([...categoriesForInterests(['Coding']).keys()]).toEqual(['Technology', 'Hackathon']);
        expect(categoriesForInterests(['Startup']).has('Art')).toBe(false);
        expect(categoriesForInterests(['  music ']).get('Cultural')).toBe('music');
        expect(categoriesForInterests(['Underwater basket weaving']).size).toBe(0);
    });
});

describe('the email', () => {
    it('escapes event titles, venues and names in the HTML', () => {
        const { html, text, subject } = renderDigestEmail({
            name: '<b>Asha</b>',
            baseUrl: 'https://campusconnect2026.netlify.app',
            unsubscribeUrl: 'https://campusconnect2026.netlify.app/digest/unsubscribe/x.y',
            items: [
                {
                    id: 'ev1',
                    title: '<script>alert(1)</script> & "Friends"',
                    date: new Date('2026-11-03T12:30:00Z'),
                    venue: '<img src=x onerror=alert(1)>',
                    college: 'IIT Madras',
                    reason: 'At your college',
                    going: false,
                },
            ],
        });
        expect(html).not.toContain('<script>');
        expect(html).not.toContain('<img');
        expect(html).not.toContain('<b>Asha');
        expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;Friends&quot;');
        expect(html).toContain('https://campusconnect2026.netlify.app/events/ev1?ref=digest');
        // IST: 12:30 UTC is 6:00 pm in India.
        expect(text).toMatch(/Tue, 3 Nov, 6:00\s?pm/i);
        expect(subject).not.toContain('!');
    });
});

describe('one-click unsubscribe', () => {
    const post = (token: string, body?: string) =>
        unsubscribe(
            new Request(`http://x/api/digest/unsubscribe/${token}`, {
                method: 'POST',
                headers: { 'content-type': 'application/x-www-form-urlencoded' },
                body: body ?? 'List-Unsubscribe=One-Click',
            }),
            { params: Promise.resolve({ token }) },
        );

    it('turns the digest off for the person the link was made for', async () => {
        mockUpdateUsers.mockResolvedValue({ count: 1 });
        const token = digestUnsubscribeToken('u1') as string;
        const res = await post(token);
        expect(res.status).toBe(200);
        expect(mockUpdateUsers).toHaveBeenCalledWith({
            where: { id: 'u1', deletedAt: null },
            data: { weeklyDigest: false },
        });
    });

    it('sends the page form back to the page', async () => {
        const token = digestUnsubscribeToken('u1') as string;
        const res = await post(token, 'from=page');
        expect(res.status).toBe(303);
        expect(res.headers.get('location')).toContain(`/digest/unsubscribe/${token}`);
    });

    it('refuses a forged token and changes nothing', async () => {
        const res = await post('u1.forgedsignatureforged0');
        expect(res.status).toBe(404);
        expect(mockUpdateUsers).not.toHaveBeenCalled();
    });

    it('has no GET, so a mail scanner opening the link changes nothing', () => {
        expect('GET' in unsubscribeRoute).toBe(false);
    });
});
