/**
 * @jest-environment node
 *
 * Volunteer roles: a student holds one role per event, a role never takes
 * more people than its slots, only the event's organisers change roles, and
 * slots never go below the people already signed up.
 */

const mockGetSession = jest.fn();
const mockNotify = jest.fn();
const mockDb = {
    event: { findFirst: jest.fn() },
    clubMember: { findUnique: jest.fn() },
    eventOrganiser: { findUnique: jest.fn() },
    volunteerRole: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    volunteerSignup: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
    },
    // The row lock on the role: answers with the role's slots.
    $queryRaw: jest.fn(),
    // The per-person advisory lock.
    $executeRaw: jest.fn(async () => 1),
    $transaction: jest.fn((fn: (tx: unknown) => unknown): unknown => fn(mockDb)),
};

// A getter, because the imports below are hoisted above mockDb's initialiser.
jest.mock('@/lib/db', () => ({ __esModule: true, get default() { return mockDb; } }));
jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }));
jest.mock('@/lib/notification-helper', () => ({
    createNotification: (...args: unknown[]) => mockNotify(...args),
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/rate-limit', () => ({
    volunteerLimiter: undefined,
    checkRateLimit: jest.fn(async () => ({ success: true })),
    getClientIp: jest.fn(async () => '127.0.0.1'),
    getRateLimitIdentifier: jest.fn(() => 'test'),
}));
jest.mock('@/lib/audit', () => ({
    audit: jest.fn(async () => undefined),
    toAuditJson: (value: unknown) => value,
}));

import {
    addVolunteerRoleAction,
    getEventVolunteering,
    removeVolunteerRoleAction,
    updateVolunteerRoleAction,
    volunteerForRoleAction,
    withdrawFromRoleAction,
} from '../actions/volunteers';
import { DEMO_EMAIL } from '../demo-account';

const DAY = 24 * 60 * 60 * 1000;
const soon = new Date(Date.now() + 7 * DAY);

const signInAs = (userId = 'me', email = 'me@x.edu') =>
    mockGetSession.mockResolvedValue({
        userId,
        user: { id: userId, name: 'Asha Rao', email, role: 'USER', avatar: null },
    });

/** An event created by `creatorId`, with no club and no co-organisers. */
const event = (over: Partial<{ creatorId: string; date: Date; verified: boolean }> = {}) => ({
    id: 'ev',
    title: 'Demo Night',
    date: soon,
    verified: true,
    creatorId: 'org',
    clubId: null,
    ...over,
});

const role = (over: Partial<{ name: string; event: ReturnType<typeof event> }> = {}) => ({
    id: 'desk',
    name: 'Registration desk',
    event: event(),
    ...over,
});

const slotsAre = (slots: number | null) => mockDb.$queryRaw.mockResolvedValue(slots === null ? [] : [{ slots }]);

beforeEach(() => {
    jest.clearAllMocks();
    // Refusals are logged as errors by the action wrapper; expected here.
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    signInAs();
    mockDb.$transaction.mockImplementation((fn: (tx: unknown) => unknown): unknown => fn(mockDb));
    mockDb.clubMember.findUnique.mockResolvedValue(null);
    mockDb.eventOrganiser.findUnique.mockResolvedValue(null);
});

describe('volunteering for a role', () => {
    beforeEach(() => {
        mockDb.volunteerRole.findFirst.mockResolvedValue(role());
        slotsAre(3);
        mockDb.volunteerSignup.findFirst.mockResolvedValue(null);
        mockDb.volunteerSignup.count.mockResolvedValue(1);
        mockDb.volunteerSignup.create.mockResolvedValue({ id: 's1' });
    });

    it('signs the student up, under both locks, and tells the organiser', async () => {
        const result = await volunteerForRoleAction({ roleId: 'desk' });

        expect(result).toEqual({ success: true, data: { roleId: 'desk', taken: 2 }, message: undefined });
        expect(mockDb.$executeRaw).toHaveBeenCalled();
        expect(mockDb.$queryRaw).toHaveBeenCalled();
        expect(String(mockDb.$queryRaw.mock.calls[0][0])).toContain('FOR UPDATE');
        expect(mockDb.volunteerSignup.create).toHaveBeenCalledWith(expect.objectContaining({ data: { roleId: 'desk', userId: 'me' } }));
        expect(mockNotify).toHaveBeenCalledWith(
            'org',
            'me',
            'EVENT_JOIN',
            expect.stringContaining('Registration desk'),
            '/events/ev/attendees',
        );
    });

    it('allows one role per person per event', async () => {
        mockDb.volunteerSignup.findFirst.mockResolvedValue({ roleId: 'stage', role: { name: 'Stage' } });

        const result = await volunteerForRoleAction({ roleId: 'desk' });

        expect(result.success).toBe(false);
        expect(!result.success && result.error).toMatch(/already volunteering as Stage/);
        expect(mockDb.volunteerSignup.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: { userId: 'me', role: { eventId: 'ev' } } }),
        );
        expect(mockDb.volunteerSignup.create).not.toHaveBeenCalled();
    });

    it('refuses the role you already hold', async () => {
        mockDb.volunteerSignup.findFirst.mockResolvedValue({ roleId: 'desk', role: { name: 'Registration desk' } });
        const result = await volunteerForRoleAction({ roleId: 'desk' });
        expect(!result.success && result.error).toMatch(/already down as Registration desk/);
        expect(mockDb.volunteerSignup.create).not.toHaveBeenCalled();
    });

    it('never takes more people than the role has slots', async () => {
        slotsAre(3);
        mockDb.volunteerSignup.count.mockResolvedValue(3);

        const result = await volunteerForRoleAction({ roleId: 'desk' });

        expect(!result.success && result.error).toMatch(/slot is taken/);
        expect(mockDb.volunteerSignup.create).not.toHaveBeenCalled();
        expect(mockNotify).not.toHaveBeenCalled();
    });

    it('reads the slots under the lock, not from before it', async () => {
        // The organiser lowered the role to 1 slot while this request waited.
        mockDb.volunteerRole.findFirst.mockResolvedValue(role());
        slotsAre(1);
        mockDb.volunteerSignup.count.mockResolvedValue(1);

        const result = await volunteerForRoleAction({ roleId: 'desk' });
        expect(result.success).toBe(false);
        expect(mockDb.volunteerSignup.create).not.toHaveBeenCalled();
    });

    it('refuses a role removed while the request waited', async () => {
        slotsAre(null);
        const result = await volunteerForRoleAction({ roleId: 'desk' });
        expect(!result.success && result.error).toMatch(/has been removed/);
    });

    it('is closed for past and unapproved events', async () => {
        mockDb.volunteerRole.findFirst.mockResolvedValue(role({ event: event({ date: new Date(Date.now() - DAY) }) }));
        expect(await volunteerForRoleAction({ roleId: 'desk' })).toMatchObject({ success: false, error: expect.stringMatching(/already happened/) });

        mockDb.volunteerRole.findFirst.mockResolvedValue(role({ event: event({ verified: false }) }));
        expect(await volunteerForRoleAction({ roleId: 'desk' })).toMatchObject({ success: false, error: expect.stringMatching(/approved/) });

        expect(mockDb.$transaction).not.toHaveBeenCalled();
    });

    it('needs a signed-in person, and not the demo account', async () => {
        mockGetSession.mockResolvedValue(null);
        expect(await volunteerForRoleAction({ roleId: 'desk' })).toMatchObject({ success: false, code: 'UNAUTHORIZED' });

        signInAs('demo', DEMO_EMAIL);
        expect(await volunteerForRoleAction({ roleId: 'desk' })).toMatchObject({ success: false, code: 'FORBIDDEN' });
        expect(mockDb.volunteerSignup.create).not.toHaveBeenCalled();
    });
});

describe('withdrawing', () => {
    it('frees the slot before the event', async () => {
        mockDb.volunteerSignup.findUnique.mockResolvedValue({ id: 's1', role: { name: 'Stage', event: event() } });
        const result = await withdrawFromRoleAction({ roleId: 'stage' });
        expect(result.success).toBe(true);
        expect(mockDb.volunteerSignup.deleteMany).toHaveBeenCalledWith({ where: { id: 's1' } });
    });

    it('keeps the role on the record once the event has happened', async () => {
        mockDb.volunteerSignup.findUnique.mockResolvedValue({
            id: 's1',
            role: { name: 'Stage', event: event({ date: new Date(Date.now() - DAY) }) },
        });
        const result = await withdrawFromRoleAction({ roleId: 'stage' });
        expect(result.success).toBe(false);
        expect(mockDb.volunteerSignup.deleteMany).not.toHaveBeenCalled();
    });
});

describe('organiser-only changes', () => {
    it('refuses someone who does not run the event', async () => {
        signInAs('stranger');
        mockDb.event.findFirst.mockResolvedValue(event());
        mockDb.volunteerRole.findFirst.mockResolvedValue(role());

        const results = await Promise.all([
            addVolunteerRoleAction({ eventId: 'ev', name: 'Stage', slots: 4 }),
            updateVolunteerRoleAction({ roleId: 'desk', slots: 10 }),
            removeVolunteerRoleAction({ roleId: 'desk' }),
        ]);

        for (const result of results) expect(result).toMatchObject({ success: false, code: 'FORBIDDEN' });
        expect(mockDb.volunteerRole.create).not.toHaveBeenCalled();
        expect(mockDb.volunteerRole.update).not.toHaveBeenCalled();
        expect(mockDb.volunteerRole.delete).not.toHaveBeenCalled();
    });

    it('lets a co-organiser add a role, with the name cleaned', async () => {
        signInAs('helper');
        mockDb.eventOrganiser.findUnique.mockResolvedValue({ id: 'o1' });
        mockDb.event.findFirst.mockResolvedValue(event());
        mockDb.volunteerRole.count.mockResolvedValue(0);
        mockDb.volunteerRole.findFirst.mockResolvedValue(null);
        mockDb.volunteerRole.create.mockResolvedValue({ id: 'new' });

        const result = await addVolunteerRoleAction({ eventId: 'ev', name: '  <b>Stage</b> crew ', slots: 6 });

        expect(result).toMatchObject({ success: true, data: { id: 'new' } });
        expect(mockDb.volunteerRole.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: { eventId: 'ev', name: 'Stage crew', description: null, slots: 6 } }),
        );
    });

    it('checks the limits on a role', async () => {
        signInAs('org');
        mockDb.event.findFirst.mockResolvedValue(event());
        expect(await addVolunteerRoleAction({ eventId: 'ev', name: 'Stage', slots: 0 })).toMatchObject({ code: 'VALIDATION_ERROR' });
        expect(await addVolunteerRoleAction({ eventId: 'ev', name: 'Stage', slots: 501 })).toMatchObject({ code: 'VALIDATION_ERROR' });
        expect(await addVolunteerRoleAction({ eventId: 'ev', name: 'x'.repeat(61), slots: 2 })).toMatchObject({ code: 'VALIDATION_ERROR' });
        expect(await addVolunteerRoleAction({ eventId: 'ev', name: 'Stage', slots: 2, description: 'x'.repeat(201) })).toMatchObject({
            code: 'VALIDATION_ERROR',
        });
        expect(mockDb.volunteerRole.create).not.toHaveBeenCalled();
    });

    it('cannot lower slots below the people signed up', async () => {
        signInAs('org');
        mockDb.volunteerRole.findFirst.mockResolvedValue(role());
        slotsAre(5);
        mockDb.volunteerSignup.count.mockResolvedValue(3);

        const lower = await updateVolunteerRoleAction({ roleId: 'desk', slots: 2 });
        expect(!lower.success && lower.error).toMatch(/at least 3 slots/);
        expect(mockDb.volunteerRole.update).not.toHaveBeenCalled();

        mockDb.volunteerRole.update.mockResolvedValue({ id: 'desk', name: 'Registration desk', description: null, slots: 3 });
        const exact = await updateVolunteerRoleAction({ roleId: 'desk', slots: 3 });
        expect(exact.success).toBe(true);
        expect(mockDb.$queryRaw).toHaveBeenCalled();
    });

    it('tells the volunteers of a removed role', async () => {
        signInAs('org');
        mockDb.volunteerRole.findFirst.mockResolvedValue(role());
        slotsAre(5);
        mockDb.volunteerSignup.findMany.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]);

        const result = await removeVolunteerRoleAction({ roleId: 'desk' });

        expect(result).toMatchObject({ success: true, data: { removed: true, notified: 2 } });
        expect(mockDb.volunteerRole.delete).toHaveBeenCalledWith({ where: { id: 'desk' } });
        expect(mockNotify).toHaveBeenCalledTimes(2);
        expect(mockNotify).toHaveBeenCalledWith('u1', 'org', 'EVENT_UPDATE', expect.stringContaining('Registration desk'), '/events/ev');
    });
});

describe('reading the roles for the event page', () => {
    it('gives counts and the caller’s own role, never who else signed up', async () => {
        mockDb.event.findFirst.mockResolvedValue({ verified: true });
        mockDb.volunteerRole.findMany.mockResolvedValue([
            { id: 'desk', name: 'Registration desk', description: null, slots: 4, _count: { signups: 2 } },
        ]);
        mockDb.volunteerSignup.findFirst.mockResolvedValue({ roleId: 'desk' });

        const data = await getEventVolunteering('ev');

        expect(data).toEqual({
            roles: [{ id: 'desk', name: 'Registration desk', description: null, slots: 4, taken: 2 }],
            myRoleId: 'desk',
            signedIn: true,
            verified: true,
        });
        const select = mockDb.volunteerRole.findMany.mock.calls[0][0].select;
        expect(select).not.toHaveProperty('signups');
    });
});
