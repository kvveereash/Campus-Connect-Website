/**
 * @jest-environment node
 *
 * Fests: who may start, edit and attach events to one; the date rules; and
 * "save the whole fest" picking only approved, live, upcoming events.
 */

const mockGetSession = jest.fn();
const mockNotify = jest.fn();
const mockDb = {
    fest: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    club: { findFirst: jest.fn() },
    clubMember: { findUnique: jest.fn() },
    college: { findUnique: jest.fn() },
    event: { findMany: jest.fn(), updateMany: jest.fn(), count: jest.fn() },
    eventInterest: { createMany: jest.fn(), count: jest.fn() },
    $transaction: jest.fn(async (ops: unknown[]) => ops),
};

// A getter, because the imports below are hoisted above mockDb's initialiser.
jest.mock('@/lib/db', () => ({ __esModule: true, get default() { return mockDb; } }));
jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }));
jest.mock('@/lib/notification-helper', () => ({
    createNotification: (...args: unknown[]) => mockNotify(...args),
}));
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
    updateTag: jest.fn(),
    unstable_cache: (fn: unknown) => fn,
}));
jest.mock('@/lib/rate-limit', () => ({
    festLimiter: undefined,
    checkRateLimit: jest.fn(async () => ({ success: true })),
    getClientIp: jest.fn(async () => '127.0.0.1'),
    getRateLimitIdentifier: jest.fn(() => 'test'),
}));
jest.mock('@/lib/audit', () => ({
    audit: jest.fn(async () => undefined),
    toAuditJson: (value: unknown) => value,
}));

import { createFest, decideFest, getMyFests, saveWholeFest, updateFest } from '../actions/fests';
import { canAttachEventToFest } from '@/app/fests/access';
import { checkFestDates, groupTimetable, mayManageFest } from '@/app/fests/rules';
import { DEMO_EMAIL } from '../demo-account';

const signInAs = (role: 'USER' | 'ADMIN' = 'USER', email = 'me@x.edu') =>
    mockGetSession.mockResolvedValue({
        userId: 'me',
        user: { id: 'me', name: 'Asha Rao', email, role, avatar: null },
    });

const asClubRole = (role: 'ADMIN' | 'MEMBER' | null) =>
    mockDb.clubMember.findUnique.mockResolvedValue(role ? { role } : null);

const NOW = new Date();
const dayKey = (offset: number) => {
    const d = new Date(NOW.getTime() + offset * 86_400_000);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
};

const goodFest = {
    name: 'Techtonic 2027',
    tagline: 'Three days of code and music',
    description: 'The annual technical and cultural fest of the college, open to every student.',
    startDate: dayKey(10),
    endDate: dayKey(12),
    coverImage: '',
};

beforeEach(() => {
    jest.clearAllMocks();
    // Refusals are logged as errors by the action wrapper; expected here.
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    signInAs();
    mockDb.fest.create.mockResolvedValue({ id: 'f1', verified: false });
    mockDb.$transaction.mockImplementation(async (ops: unknown[]) => ops);
});

describe('the date rules', () => {
    it('accepts a fest of up to 14 days, counting both ends', () => {
        expect(checkFestDates('2027-02-01', '2027-02-14', { isNew: false })).toBeNull();
        expect(checkFestDates('2027-02-13', '2027-02-13', { isNew: false })).toBeNull();
    });

    it('refuses a 15-day fest', () => {
        expect(checkFestDates('2027-02-01', '2027-02-15', { isNew: false })).toMatch(/at most 14 days/);
    });

    it('refuses an end before the start', () => {
        expect(checkFestDates('2027-02-13', '2027-02-12', { isNew: false })).toMatch(/cannot come before/);
    });

    it('refuses dates that do not exist or are missing', () => {
        expect(checkFestDates('2027-02-30', '2027-03-01', { isNew: false })).toMatch(/starts/);
        expect(checkFestDates('2027-02-01', '', { isNew: false })).toMatch(/ends/);
    });

    it('refuses a new fest that is already over, but lets an old one be corrected', () => {
        const now = new Date('2027-03-10T12:00:00+05:30');
        expect(checkFestDates('2027-03-01', '2027-03-03', { isNew: true, now })).toMatch(/over/);
        expect(checkFestDates('2027-03-01', '2027-03-03', { isNew: false, now })).toBeNull();
        // A fest that ends today is still fine to start.
        expect(checkFestDates('2027-03-08', '2027-03-10', { isNew: true, now })).toBeNull();
    });

    it('is enforced by the server too', async () => {
        const result = await createFest({ ...goodFest, clubId: 'c1', startDate: dayKey(10), endDate: dayKey(30) });
        expect(result).toMatchObject({ success: false, error: expect.stringMatching(/at most 14 days/) });
        expect(mockDb.fest.create).not.toHaveBeenCalled();
    });
});

describe('the timetable', () => {
    it('groups by the Indian calendar day, not the server’s', () => {
        const days = groupTimetable(
            [
                // 11:30 pm IST on the 13th is the 13th in India, the 13th in UTC too.
                { id: 'b', date: '2027-02-13T18:00:00.000Z' },
                // 1 am IST on the 14th is still the 13th in UTC.
                { id: 'c', date: '2027-02-13T19:30:00.000Z' },
                { id: 'a', date: '2027-02-13T04:30:00.000Z' },
                // The evening before the fest: its own day, with no "Day N".
                { id: 'z', date: '2027-02-12T13:00:00.000Z' },
            ],
            '2027-02-12T18:30:00.000Z',
            '2027-02-15T18:29:59.999Z'
        );
        expect(days.map((d) => [d.key, d.dayLabel, d.items.map((i) => i.id)])).toEqual([
            ['2027-02-12', null, ['z']],
            ['2027-02-13', 'Day 1', ['a', 'b']],
            ['2027-02-14', 'Day 2', ['c']],
        ]);
    });
});

describe('who may start a fest', () => {
    it('lets an admin of an approved club start one, at that club’s college', async () => {
        mockDb.club.findFirst.mockResolvedValue({ id: 'c1', collegeId: 'college-of-club' });
        asClubRole('ADMIN');
        const result = await createFest({ ...goodFest, clubId: 'c1', collegeId: 'some-other-college' });
        expect(result.success).toBe(true);
        expect(mockDb.club.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'c1', verified: true, deletedAt: null } })
        );
        expect(mockDb.fest.create.mock.calls[0][0].data).toMatchObject({
            collegeId: 'college-of-club',
            clubId: 'c1',
            creatorId: 'me',
            verified: false,
            name: 'Techtonic 2027',
        });
    });

    it('refuses a club member who is not an admin', async () => {
        mockDb.club.findFirst.mockResolvedValue({ id: 'c1', collegeId: 'k' });
        asClubRole('MEMBER');
        const result = await createFest({ ...goodFest, clubId: 'c1' });
        expect(result).toMatchObject({ success: false, code: 'FORBIDDEN' });
        expect(mockDb.fest.create).not.toHaveBeenCalled();
    });

    it('refuses a club that is not approved', async () => {
        mockDb.club.findFirst.mockResolvedValue(null);
        asClubRole('ADMIN');
        const result = await createFest({ ...goodFest, clubId: 'c1' });
        expect(result.success).toBe(false);
        expect(mockDb.fest.create).not.toHaveBeenCalled();
    });

    it('refuses a student with no club at all', async () => {
        const result = await createFest({ ...goodFest, collegeId: 'k' });
        expect(result).toMatchObject({ success: false, code: 'FORBIDDEN' });
    });

    it('lets a site admin start one at a college, approved at once', async () => {
        signInAs('ADMIN');
        mockDb.college.findUnique.mockResolvedValue({ id: 'k' });
        mockDb.fest.create.mockResolvedValue({ id: 'f1', verified: true });
        const result = await createFest({ ...goodFest, collegeId: 'k' });
        expect(result.success).toBe(true);
        expect(mockDb.fest.create.mock.calls[0][0].data).toMatchObject({ collegeId: 'k', clubId: null, verified: true });
    });

    it('refuses the shared demo account', async () => {
        signInAs('USER', DEMO_EMAIL);
        const result = await createFest({ ...goodFest, clubId: 'c1' });
        expect(result).toMatchObject({ success: false, code: 'FORBIDDEN' });
        expect(mockDb.fest.create).not.toHaveBeenCalled();
    });

    it('strips markup from the text', async () => {
        mockDb.club.findFirst.mockResolvedValue({ id: 'c1', collegeId: 'k' });
        asClubRole('ADMIN');
        await createFest({ ...goodFest, clubId: 'c1', name: '<b>Techtonic</b> & friends' });
        expect(mockDb.fest.create.mock.calls[0][0].data.name).toBe('Techtonic & friends');
    });
});

describe('who may edit a fest and attach events to it', () => {
    const fest = (over: Record<string, unknown> = {}) => ({
        id: 'f1',
        name: goodFest.name,
        tagline: goodFest.tagline,
        description: goodFest.description,
        startDate: new Date(`${goodFest.startDate}T00:00:00.000+05:30`),
        endDate: new Date(`${goodFest.endDate}T23:59:59.999+05:30`),
        coverImage: null,
        creatorId: 'someone-else',
        clubId: 'c1',
        verified: true,
        collegeId: 'k',
        ...over,
    });

    it('follows the rule: creator, club admin or site admin', () => {
        const base = { role: 'USER', userId: 'me', creatorId: 'x', isClubAdmin: false };
        expect(mayManageFest(base)).toBe(false);
        expect(mayManageFest({ ...base, creatorId: 'me' })).toBe(true);
        expect(mayManageFest({ ...base, isClubAdmin: true })).toBe(true);
        expect(mayManageFest({ ...base, role: 'ADMIN' })).toBe(true);
        // A fest whose creator left has a null creator; null never matches.
        expect(mayManageFest({ ...base, creatorId: null })).toBe(false);
    });

    it('refuses an edit from someone who does not run the fest', async () => {
        mockDb.fest.findFirst.mockResolvedValue(fest());
        asClubRole('MEMBER');
        const result = await updateFest('f1', goodFest);
        expect(result).toMatchObject({ success: false, code: 'FORBIDDEN' });
        expect(mockDb.fest.update).not.toHaveBeenCalled();
    });

    it('sends a club admin’s change to an approved fest back for approval', async () => {
        mockDb.fest.findFirst.mockResolvedValue(fest());
        asClubRole('ADMIN');
        const result = await updateFest('f1', { ...goodFest, tagline: 'Now with a hackathon' });
        expect(result).toMatchObject({ success: true, data: { backToQueue: true, verified: false } });
        expect(mockDb.fest.update.mock.calls[0][0].data).toMatchObject({ verified: false });
    });

    it('keeps an approved fest live when nothing changed', async () => {
        mockDb.fest.findFirst.mockResolvedValue(fest({ creatorId: 'me' }));
        const result = await updateFest('f1', goodFest);
        expect(result).toMatchObject({ success: true, data: { backToQueue: false, verified: true } });
        expect(mockDb.fest.update.mock.calls[0][0].data).not.toHaveProperty('verified');
    });

    it('lets the creator attach an event hosted at the fest’s college', async () => {
        mockDb.fest.findFirst.mockResolvedValue(fest({ creatorId: 'me' }));
        await expect(canAttachEventToFest('f1', 'me', 'USER', 'k')).resolves.toBe(true);
    });

    it('lets an admin of the fest’s club attach one', async () => {
        mockDb.fest.findFirst.mockResolvedValue(fest());
        asClubRole('ADMIN');
        await expect(canAttachEventToFest('f1', 'me', 'USER', 'k')).resolves.toBe(true);
    });

    it('refuses anyone else', async () => {
        mockDb.fest.findFirst.mockResolvedValue(fest());
        asClubRole('MEMBER');
        await expect(canAttachEventToFest('f1', 'me', 'USER', 'k')).resolves.toBe(false);
    });

    it('refuses an event at another college, even for a site admin', async () => {
        mockDb.fest.findFirst.mockResolvedValue(fest());
        await expect(canAttachEventToFest('f1', 'me', 'ADMIN', 'another-college')).resolves.toBe(false);
    });

    it('refuses a fest that is gone', async () => {
        mockDb.fest.findFirst.mockResolvedValue(null);
        await expect(canAttachEventToFest('f1', 'me', 'ADMIN', 'k')).resolves.toBe(false);
        expect(mockDb.fest.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'f1', deletedAt: null } })
        );
    });

    it('lists only the caller’s own and their clubs’ fests, not ended ones', async () => {
        mockDb.fest.findMany.mockResolvedValue([]);
        await getMyFests();
        const where = mockDb.fest.findMany.mock.calls[0][0].where;
        expect(where).toMatchObject({
            deletedAt: null,
            OR: [{ creatorId: 'me' }, { club: { members: { some: { userId: 'me', role: 'ADMIN' } } } }],
        });
        expect(where.endDate.gte).toBeInstanceOf(Date);
    });

    it('lists nothing to a visitor who is signed out', async () => {
        mockGetSession.mockResolvedValue(null);
        await expect(getMyFests()).resolves.toEqual([]);
        expect(mockDb.fest.findMany).not.toHaveBeenCalled();
    });
});

describe('approving and rejecting', () => {
    it('is for site admins only', async () => {
        const result = await decideFest('f1', true);
        expect(result).toMatchObject({ success: false, code: 'FORBIDDEN' });
        expect(mockDb.fest.update).not.toHaveBeenCalled();
    });

    it('approves and tells the creator', async () => {
        signInAs('ADMIN');
        mockDb.fest.findFirst.mockResolvedValue({ id: 'f1', name: 'Techtonic', creatorId: 'organiser', verified: false });
        const result = await decideFest('f1', true);
        expect(result.success).toBe(true);
        expect(mockDb.fest.update.mock.calls[0][0]).toMatchObject({ where: { id: 'f1' }, data: { verified: true } });
        expect(mockNotify).toHaveBeenCalledWith('organiser', 'me', 'EVENT_UPDATE', expect.stringContaining('approved'), '/fests/f1');
    });

    it('rejects by taking the fest down, freeing its events, with the reason', async () => {
        signInAs('ADMIN');
        mockDb.fest.findFirst.mockResolvedValue({ id: 'f1', name: 'Techtonic', creatorId: 'organiser', verified: false });
        const result = await decideFest('f1', false, 'The dates clash with exams');
        expect(result.success).toBe(true);
        expect(mockDb.event.updateMany).toHaveBeenCalledWith({ where: { festId: 'f1' }, data: { festId: null } });
        expect(mockDb.fest.update.mock.calls[0][0].data.deletedAt).toBeInstanceOf(Date);
        expect(mockNotify.mock.calls[0][3]).toContain('The dates clash with exams.');
    });
});

describe('saving the whole fest', () => {
    it('saves only approved, live, upcoming events, keeping earlier saves', async () => {
        mockDb.fest.findFirst.mockResolvedValue({ id: 'f1' });
        mockDb.event.findMany.mockResolvedValue([{ id: 'e1' }, { id: 'e2' }]);
        mockDb.eventInterest.createMany.mockResolvedValue({ count: 1 });

        const result = await saveWholeFest('f1');

        expect(result).toEqual({ success: true, data: { added: 1, total: 2 }, message: undefined });
        expect(mockDb.fest.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'f1', verified: true, deletedAt: null } })
        );
        const where = mockDb.event.findMany.mock.calls[0][0].where;
        expect(where).toMatchObject({ festId: 'f1', verified: true, deletedAt: null });
        expect(where.date.gte).toBeInstanceOf(Date);
        expect(Math.abs(where.date.gte.getTime() - Date.now())).toBeLessThan(5_000);
        expect(mockDb.eventInterest.createMany).toHaveBeenCalledWith({
            data: [
                { userId: 'me', eventId: 'e1' },
                { userId: 'me', eventId: 'e2' },
            ],
            skipDuplicates: true,
        });
    });

    it('says so when nothing is left to save', async () => {
        mockDb.fest.findFirst.mockResolvedValue({ id: 'f1' });
        mockDb.event.findMany.mockResolvedValue([]);
        const result = await saveWholeFest('f1');
        expect(result).toMatchObject({ success: false, error: expect.stringMatching(/already happened/) });
        expect(mockDb.eventInterest.createMany).not.toHaveBeenCalled();
    });

    it('refuses a fest that is not approved', async () => {
        mockDb.fest.findFirst.mockResolvedValue(null);
        mockDb.event.findMany.mockResolvedValue([{ id: 'e1' }]);
        const result = await saveWholeFest('f1');
        expect(result.success).toBe(false);
        expect(mockDb.eventInterest.createMany).not.toHaveBeenCalled();
    });

    it('is open to the demo account, since it only saves for itself', async () => {
        signInAs('USER', DEMO_EMAIL);
        mockDb.fest.findFirst.mockResolvedValue({ id: 'f1' });
        mockDb.event.findMany.mockResolvedValue([{ id: 'e1' }]);
        mockDb.eventInterest.createMany.mockResolvedValue({ count: 1 });
        const result = await saveWholeFest('f1');
        expect(result.success).toBe(true);
    });
});
