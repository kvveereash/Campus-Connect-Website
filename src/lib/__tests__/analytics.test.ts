/**
 * @jest-environment node
 *
 * Organiser analytics: how a visit's source is worked out (?ref= first, then
 * the referrer), the Indian-day bucket a view lands in, the counts the
 * organiser sees, and the view endpoint turning away bots, other sites and
 * made-up sources.
 */

const mockExecuteRaw = jest.fn();
const mockCheckRateLimit = jest.fn();
const mockWarn = jest.fn();
const mockDb = {
    $executeRaw: (...a: unknown[]) => mockExecuteRaw(...a),
    eventView: { groupBy: jest.fn() },
    eventRegistration: { groupBy: jest.fn(), count: jest.fn() },
};

// A getter, because the imports below are hoisted above mockDb's initialiser.
jest.mock('@/lib/db', () => ({ __esModule: true, get default() { return mockDb; } }));
jest.mock('@/lib/logger', () => ({ logger: { warn: (...a: unknown[]) => mockWarn(...a) } }));
jest.mock('@/lib/ticket', () => ({ GOING: ['PAID', 'COMPLETED'] }));
jest.mock('@/lib/rate-limit', () => ({
    viewLimiter: undefined,
    checkRateLimit: (...a: unknown[]) => mockCheckRateLimit(...a),
    getRateLimitIdentifier: jest.fn(() => 'ip:test'),
    getClientIp: jest.fn(async () => '203.0.113.7'),
}));

import {
    getEventAnalytics,
    isBotUserAgent,
    istDayKey,
    istDayKeyDaysAgo,
    normaliseSource,
    recordView,
    resolveSource,
    sourceFromReferrer,
    withRef,
} from '../analytics';
import { POST } from '@/app/api/events/[id]/view/route';

const HOST = 'campusconnect2026.netlify.app';
const CHROME = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';

beforeEach(() => {
    jest.clearAllMocks();
    mockExecuteRaw.mockResolvedValue(1);
    mockCheckRateLimit.mockResolvedValue({ success: true });
});

describe('normaliseSource', () => {
    it('keeps a known source, whatever its case or spacing', () => {
        expect(normaliseSource('whatsapp')).toBe('whatsapp');
        expect(normaliseSource('  Board ')).toBe('board');
        expect(normaliseSource('DIGEST')).toBe('digest');
    });

    it('maps the other spellings of a source', () => {
        expect(normaliseSource('wa')).toBe('whatsapp');
        expect(normaliseSource('ics')).toBe('calendar');
        expect(normaliseSource('widget')).toBe('embed');
        expect(normaliseSource('newsletter')).toBe('digest');
    });

    it('treats a missing value as direct and anything unknown as other', () => {
        expect(normaliseSource(undefined)).toBe('direct');
        expect(normaliseSource(null)).toBe('direct');
        expect(normaliseSource('   ')).toBe('direct');
        expect(normaliseSource(42)).toBe('direct');
        expect(normaliseSource('instagram-story-ad')).toBe('other');
        expect(normaliseSource('<script>')).toBe('other');
    });
});

describe('sourceFromReferrer', () => {
    it('reads pages on this site', () => {
        expect(sourceFromReferrer(`https://${HOST}/events`, HOST)).toBe('board');
        expect(sourceFromReferrer(`https://${HOST}/events?category=Technology`, HOST)).toBe('board');
        expect(sourceFromReferrer(`https://${HOST}/`, HOST)).toBe('board');
        expect(sourceFromReferrer(`https://${HOST}/fests/abc`, HOST)).toBe('fest');
        expect(sourceFromReferrer(`https://${HOST}/search?q=dance`, HOST)).toBe('search');
    });

    it('reads WhatsApp, search engines and other sites', () => {
        expect(sourceFromReferrer('https://wa.me/', HOST)).toBe('whatsapp');
        expect(sourceFromReferrer('https://web.whatsapp.com/', HOST)).toBe('whatsapp');
        expect(sourceFromReferrer('https://www.google.com/', HOST)).toBe('search');
        expect(sourceFromReferrer('https://www.instagram.com/', HOST)).toBe('other');
        // Another site that merely contains our name is still another site.
        expect(sourceFromReferrer(`https://${HOST}.evil.example/events`, HOST)).toBe('other');
    });

    it('calls no referrer direct and a broken one other', () => {
        expect(sourceFromReferrer('', HOST)).toBe('direct');
        expect(sourceFromReferrer(undefined, HOST)).toBe('direct');
        expect(sourceFromReferrer('not a url', HOST)).toBe('other');
    });

    it('lets an explicit ?ref= win over the referrer', () => {
        expect(resolveSource('whatsapp', `https://${HOST}/events`, HOST)).toBe('whatsapp');
        expect(resolveSource('calendar', '', HOST)).toBe('calendar');
        expect(resolveSource(null, 'https://wa.me/', HOST)).toBe('whatsapp');
        expect(resolveSource('', '', HOST)).toBe('direct');
    });
});

describe('withRef', () => {
    it('adds ?ref= and keeps any query or fragment', () => {
        expect(withRef('/events/e1', 'whatsapp')).toBe('/events/e1?ref=whatsapp');
        expect(withRef('/events/e1?tab=team', 'share')).toBe('/events/e1?tab=team&ref=share');
        expect(withRef('/events/e1#reviews', 'share')).toBe('/events/e1?ref=share#reviews');
    });
});

describe('Indian day buckets', () => {
    it('puts late evening UTC on the next Indian day', () => {
        // 23:59:59 IST on 27 October, then midnight IST on the 28th.
        expect(istDayKey(new Date('2026-10-27T18:29:59Z'))).toBe('2026-10-27');
        expect(istDayKey(new Date('2026-10-27T18:30:00Z'))).toBe('2026-10-28');
        // 05:29 IST is still the same Indian day as 00:00 UTC.
        expect(istDayKey(new Date('2026-10-27T00:00:00Z'))).toBe('2026-10-27');
    });

    it('counts days back on Indian time', () => {
        const now = new Date('2026-11-01T20:00:00Z'); // 1:30 on 2 November, IST
        expect(istDayKeyDaysAgo(0, now)).toBe('2026-11-02');
        expect(istDayKeyDaysAgo(2, now)).toBe('2026-10-31');
    });
});

describe('recordView', () => {
    afterEach(() => jest.useRealTimers());

    it('adds one to the count for today, Indian time', async () => {
        jest.useFakeTimers({ now: new Date('2026-10-27T19:00:00Z') });

        await expect(recordView('e1', 'whatsapp')).resolves.toBe(true);

        const [, ...values] = mockExecuteRaw.mock.calls[0];
        expect(values).toEqual(['2026-10-28', 'whatsapp', 'e1']);
    });

    it('fails quietly for an event that does not exist or a database error', async () => {
        mockExecuteRaw.mockResolvedValueOnce(0);
        await expect(recordView('nope', 'board')).resolves.toBe(false);

        mockExecuteRaw.mockRejectedValueOnce(new Error('connection reset'));
        await expect(recordView('e1', 'board')).resolves.toBe(false);
        expect(mockWarn).toHaveBeenCalledWith('event_view_not_recorded', expect.objectContaining({ eventId: 'e1' }));
    });
});

describe('getEventAnalytics', () => {
    afterEach(() => jest.useRealTimers());

    it('adds up views, registrations and check-ins by source and by day', async () => {
        jest.useFakeTimers({ now: new Date('2026-10-27T06:00:00Z') });
        mockDb.eventView.groupBy.mockImplementation(async ({ by }: { by: string[] }) =>
            by[0] === 'source'
                ? [
                      { source: 'board', _sum: { count: 60 } },
                      { source: 'whatsapp', _sum: { count: 40 } },
                  ]
                : [
                      { day: new Date('2026-10-27T00:00:00Z'), _sum: { count: 30 } },
                      { day: new Date('2026-10-20T00:00:00Z'), _sum: { count: 70 } },
                  ],
        );
        mockDb.eventRegistration.groupBy.mockResolvedValue([
            { source: 'whatsapp', _count: { _all: 12 } },
            { source: 'board', _count: { _all: 6 } },
            { source: null, _count: { _all: 2 } },
        ]);
        mockDb.eventRegistration.count.mockResolvedValue(10);

        const result = await getEventAnalytics('e1');

        expect(result.totals).toEqual({ views: 100, registrations: 20, checkIns: 10 });
        expect(result.conversion).toEqual({ viewToRegistration: 0.2, registrationToCheckIn: 0.5 });
        expect(result.sources).toEqual([
            { source: 'board', views: 60, registrations: 6 },
            { source: 'whatsapp', views: 40, registrations: 12 },
            { source: 'unknown', views: 0, registrations: 2 },
        ]);
        expect(result.daily).toHaveLength(30);
        expect(result.daily[29]).toEqual({ day: '2026-10-27', views: 30 });
        expect(result.daily[22]).toEqual({ day: '2026-10-20', views: 70 });
        expect(result.daily[0].day).toBe('2026-09-28');
    });

    it('has no conversion to show before anyone has looked', async () => {
        mockDb.eventView.groupBy.mockResolvedValue([]);
        mockDb.eventRegistration.groupBy.mockResolvedValue([]);
        mockDb.eventRegistration.count.mockResolvedValue(0);

        const result = await getEventAnalytics('e1');

        expect(result.totals.views).toBe(0);
        expect(result.conversion).toEqual({ viewToRegistration: null, registrationToCheckIn: null });
        expect(result.sources).toEqual([]);
    });
});

describe('POST /api/events/[id]/view', () => {
    const call = (init: { id?: string; query?: string; userAgent?: string | null; origin?: string; body?: string } = {}) => {
        const headers = new Headers();
        if (init.userAgent !== null) headers.set('user-agent', init.userAgent ?? CHROME);
        if (init.origin) headers.set('origin', init.origin);
        const request = new Request(`https://${HOST}/api/events/${init.id ?? 'e1'}/view${init.query ?? ''}`, {
            method: 'POST',
            headers,
            body: init.body,
        });
        return POST(request, { params: Promise.resolve({ id: init.id ?? 'e1' }) });
    };

    it('counts a view from a browser', async () => {
        const response = await call({ query: '?source=whatsapp', origin: `https://${HOST}` });

        expect(response.status).toBe(204);
        expect(mockExecuteRaw).toHaveBeenCalledTimes(1);
        expect(mockExecuteRaw.mock.calls[0]).toContain('whatsapp');
    });

    it('counts a view with no source as direct, and reads a JSON body', async () => {
        await call();
        expect(mockExecuteRaw.mock.calls[0]).toContain('direct');

        await call({ body: JSON.stringify({ source: 'embed' }) });
        expect(mockExecuteRaw.mock.calls[1]).toContain('embed');
    });

    it('ignores bots and requests without a user agent', async () => {
        for (const userAgent of ['Googlebot/2.1 (+http://www.google.com/bot.html)', 'WhatsApp/2.23.20.0 A', 'curl/8.4.0', null]) {
            const response = await call({ query: '?source=board', userAgent });
            expect(response.status).toBe(204);
        }
        expect(mockExecuteRaw).not.toHaveBeenCalled();
        expect(isBotUserAgent(CHROME)).toBe(false);
    });

    it('ignores a view posted from another site', async () => {
        const response = await call({ query: '?source=board', origin: 'https://inflate-my-numbers.example' });

        expect(response.status).toBe(204);
        expect(mockExecuteRaw).not.toHaveBeenCalled();
    });

    it('rejects a source it does not know', async () => {
        for (const query of ['?source=instagram', '?source=BOARD', '?source=']) {
            const response = await call({ query });
            expect(response.status).toBe(400);
        }
        const response = await call({ body: JSON.stringify({ source: 7 }) });
        expect(response.status).toBe(400);
        expect(mockExecuteRaw).not.toHaveBeenCalled();
    });

    it('rejects an id that cannot be an event', async () => {
        const response = await call({ id: '../../admin' });

        expect(response.status).toBe(404);
        expect(mockExecuteRaw).not.toHaveBeenCalled();
    });

    it('stops counting past the rate limit', async () => {
        mockCheckRateLimit.mockResolvedValueOnce({ success: false });

        const response = await call({ query: '?source=board' });

        expect(response.status).toBe(429);
        expect(mockExecuteRaw).not.toHaveBeenCalled();
    });
});
