/**
 * @jest-environment node
 *
 * Club recruitment: only a club's admins open, close and decide; a student
 * applies once, to an approved club that is recruiting and that they are not
 * already in; accepting makes them a member; the demo account is refused.
 */

const mockGetSession = jest.fn();
const mockNotify = jest.fn();
const mockUpdateTag = jest.fn();
const mockDb = {
    club: { findFirst: jest.fn(), updateMany: jest.fn() },
    clubMember: { findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn() },
    clubApplication: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: unknown) => unknown): unknown => fn(mockDb)),
};

// A getter, because the imports below are hoisted above mockDb's initialiser.
jest.mock('@/lib/db', () => ({ __esModule: true, get default() { return mockDb; } }));
jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }));
jest.mock('@/lib/notification-helper', () => ({
    createNotification: (...args: unknown[]) => mockNotify(...args),
}));
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
    updateTag: (...args: unknown[]) => mockUpdateTag(...args),
}));
jest.mock('@/lib/rate-limit', () => ({
    applicationLimiter: undefined,
    checkRateLimit: jest.fn(async () => ({ success: true })),
    getClientIp: jest.fn(async () => '127.0.0.1'),
    getRateLimitIdentifier: jest.fn(() => 'test'),
}));
jest.mock('@/lib/audit', () => ({
    audit: jest.fn(async () => undefined),
    toAuditJson: (value: unknown) => value,
}));

import {
    applyToClub,
    closeRecruitment,
    decideApplication,
    getApplications,
    getMyApplication,
    openRecruitment,
} from '../actions/recruitment';
import { DEMO_EMAIL } from '../demo-account';

const signInAs = (email = 'me@x.edu') =>
    mockGetSession.mockResolvedValue({
        userId: 'me',
        user: { id: 'me', name: 'Asha Rao', email, role: 'USER', avatar: null },
    });

const asClubRole = (role: 'ADMIN' | 'MEMBER' | null) =>
    mockDb.clubMember.findUnique.mockResolvedValue(role ? { id: 'm1', role } : null);

const recruitingClub = {
    id: 'c1',
    name: 'Robotics Club',
    recruiting: true,
    recruitQuestions: ['Why join?', 'What have you built?'],
};

beforeEach(() => {
    jest.clearAllMocks();
    // Refusals are logged as errors by the action wrapper; expected here.
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    signInAs();
    mockDb.$transaction.mockImplementation((fn: (tx: unknown) => unknown): unknown => fn(mockDb));
});

describe('opening and closing applications', () => {
    it('refuses a club member who is not an admin', async () => {
        asClubRole('MEMBER');
        const result = await openRecruitment('c1', ['Why join?']);
        expect(result.success).toBe(false);
        expect(mockDb.club.updateMany).not.toHaveBeenCalled();
    });

    it('refuses someone outside the club', async () => {
        asClubRole(null);
        expect((await closeRecruitment('c1')).success).toBe(false);
        expect(mockDb.club.updateMany).not.toHaveBeenCalled();
    });

    it('lets a club admin open with cleaned questions, and refreshes the club', async () => {
        asClubRole('ADMIN');
        mockDb.club.updateMany.mockResolvedValue({ count: 1 });
        const result = await openRecruitment('c1', ['<b>Why</b> join?', '   ']);
        expect(result.success).toBe(true);
        expect(mockDb.club.updateMany).toHaveBeenCalledWith({
            where: { id: 'c1', deletedAt: null },
            data: { recruiting: true, recruitQuestions: ['Why join?'] },
        });
        expect(mockUpdateTag).toHaveBeenCalledWith('club-c1');
    });

    it('lets a club admin close', async () => {
        asClubRole('ADMIN');
        mockDb.club.updateMany.mockResolvedValue({ count: 1 });
        expect((await closeRecruitment('c1')).success).toBe(true);
        expect(mockDb.club.updateMany).toHaveBeenCalledWith({
            where: { id: 'c1', deletedAt: null },
            data: { recruiting: false },
        });
    });

    it('refuses more than three questions, or one over 200 characters', async () => {
        asClubRole('ADMIN');
        expect((await openRecruitment('c1', ['a', 'b', 'c', 'd'])).success).toBe(false);
        expect((await openRecruitment('c1', ['x'.repeat(201)])).success).toBe(false);
        expect((await openRecruitment('c1', [])).success).toBe(false);
        expect(mockDb.club.updateMany).not.toHaveBeenCalled();
    });
});

describe('applying', () => {
    const setUp = ({
        club = recruitingClub as typeof recruitingClub | null,
        member = false,
        applied = false,
    } = {}) => {
        mockDb.club.findFirst.mockResolvedValue(club);
        mockDb.clubMember.findUnique.mockResolvedValue(member ? { id: 'm1' } : null);
        mockDb.clubApplication.findUnique.mockResolvedValue(applied ? { id: 'a0' } : null);
        mockDb.clubMember.findMany.mockResolvedValue([{ userId: 'admin1' }, { userId: 'admin2' }]);
        mockDb.clubApplication.create.mockResolvedValue({ createdAt: new Date('2026-10-27T10:00:00Z') });
    };

    it('sends an application and tells every club admin', async () => {
        setUp();
        const result = await applyToClub('c1', ['To learn', 'A line follower']);
        expect(result.success).toBe(true);
        expect(mockDb.clubApplication.create).toHaveBeenCalledWith({
            data: {
                clubId: 'c1',
                userId: 'me',
                answers: [
                    { question: 'Why join?', answer: 'To learn' },
                    { question: 'What have you built?', answer: 'A line follower' },
                ],
            },
            select: { createdAt: true },
        });
        expect(mockNotify).toHaveBeenCalledTimes(2);
        expect(mockNotify).toHaveBeenCalledWith(
            'admin1', 'me', 'CLUB_UPDATE', expect.stringContaining('Robotics Club'), '/clubs/c1#applications'
        );
    });

    it('only looks for an approved, live club', async () => {
        setUp();
        await applyToClub('c1', ['a', 'b']);
        expect(mockDb.club.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'c1', verified: true, deletedAt: null } })
        );
    });

    it('refuses when the club is not recruiting', async () => {
        setUp({ club: { ...recruitingClub, recruiting: false } });
        expect((await applyToClub('c1', ['a', 'b'])).success).toBe(false);
        expect(mockDb.clubApplication.create).not.toHaveBeenCalled();
    });

    it('refuses an unapproved or missing club', async () => {
        setUp({ club: null });
        expect((await applyToClub('c1', ['a', 'b'])).success).toBe(false);
        expect(mockDb.clubApplication.create).not.toHaveBeenCalled();
    });

    it('refuses someone already in the club', async () => {
        setUp({ member: true });
        expect((await applyToClub('c1', ['a', 'b'])).success).toBe(false);
        expect(mockDb.clubApplication.create).not.toHaveBeenCalled();
    });

    it('refuses a second application', async () => {
        setUp({ applied: true });
        expect((await applyToClub('c1', ['a', 'b'])).success).toBe(false);
        expect(mockDb.clubApplication.create).not.toHaveBeenCalled();
    });

    it('refuses answers that do not match the questions, or are blank', async () => {
        setUp();
        expect((await applyToClub('c1', ['only one'])).success).toBe(false);
        expect((await applyToClub('c1', ['a', '<p></p>'])).success).toBe(false);
        expect((await applyToClub('c1', ['a', 'x'.repeat(1001)])).success).toBe(false);
        expect(mockDb.clubApplication.create).not.toHaveBeenCalled();
        expect(mockNotify).not.toHaveBeenCalled();
    });
});

describe('deciding', () => {
    const pending = { id: 'a1', clubId: 'c1', userId: 'student', status: 'PENDING', club: { name: 'Robotics Club' } };

    it('refuses anyone who is not a club admin', async () => {
        mockDb.clubApplication.findUnique.mockResolvedValue(pending);
        asClubRole('MEMBER');
        const result = await decideApplication('a1', 'ACCEPTED');
        expect(result.success).toBe(false);
        expect(mockDb.$transaction).not.toHaveBeenCalled();
        expect(mockDb.clubMember.upsert).not.toHaveBeenCalled();
    });

    it('accepting makes the applicant a member in the same transaction, and tells them', async () => {
        mockDb.clubApplication.findUnique.mockResolvedValue(pending);
        asClubRole('ADMIN');
        mockDb.clubApplication.updateMany.mockResolvedValue({ count: 1 });
        const result = await decideApplication('a1', 'ACCEPTED');
        expect(result.success).toBe(true);
        expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
        expect(mockDb.clubApplication.updateMany).toHaveBeenCalledWith({
            where: { id: 'a1', status: 'PENDING' },
            data: { status: 'ACCEPTED', decidedAt: expect.any(Date) },
        });
        expect(mockDb.clubMember.upsert).toHaveBeenCalledWith({
            where: { userId_clubId: { userId: 'student', clubId: 'c1' } },
            create: { userId: 'student', clubId: 'c1', role: 'MEMBER' },
            update: {},
        });
        expect(mockNotify).toHaveBeenCalledWith(
            'student', 'me', 'CLUB_INVITE', expect.stringContaining('accepted'), '/clubs/c1'
        );
    });

    it('declining adds no member, and tells the applicant', async () => {
        mockDb.clubApplication.findUnique.mockResolvedValue(pending);
        asClubRole('ADMIN');
        mockDb.clubApplication.updateMany.mockResolvedValue({ count: 1 });
        expect((await decideApplication('a1', 'DECLINED')).success).toBe(true);
        expect(mockDb.clubMember.upsert).not.toHaveBeenCalled();
        expect(mockNotify).toHaveBeenCalledWith(
            'student', 'me', 'CLUB_UPDATE', expect.stringContaining('declined'), '/clubs/c1'
        );
    });

    it('does not decide an application twice', async () => {
        mockDb.clubApplication.findUnique.mockResolvedValue(pending);
        asClubRole('ADMIN');
        // Another admin got there between the read and the write.
        mockDb.clubApplication.updateMany.mockResolvedValue({ count: 0 });
        expect((await decideApplication('a1', 'ACCEPTED')).success).toBe(false);
        expect(mockDb.clubMember.upsert).not.toHaveBeenCalled();
        expect(mockNotify).not.toHaveBeenCalled();
    });
});

describe('reading applications', () => {
    it('refuses the list to anyone who is not a club admin', async () => {
        asClubRole('MEMBER');
        mockDb.clubApplication.findMany.mockResolvedValue([]);
        expect((await getApplications('c1')).success).toBe(false);
    });

    it('gives a club admin applicants without private fields', async () => {
        asClubRole('ADMIN');
        mockDb.clubApplication.findMany.mockResolvedValue([
            {
                id: 'a1',
                status: 'PENDING',
                answers: [{ question: 'Why join?', answer: 'To learn' }],
                createdAt: new Date('2026-10-27T10:00:00Z'),
                user: { id: 'student', name: 'Ravi', avatar: null, college: { name: 'IIT Madras' } },
            },
        ]);
        const result = await getApplications('c1');
        expect(result.success && result.data).toEqual([
            {
                id: 'a1',
                status: 'PENDING',
                answers: [{ question: 'Why join?', answer: 'To learn' }],
                createdAt: '2026-10-27T10:00:00.000Z',
                applicant: { id: 'student', name: 'Ravi', avatar: null, college: 'IIT Madras' },
            },
        ]);
        const select = mockDb.clubApplication.findMany.mock.calls[0][0].select;
        expect(Object.keys(select.user.select).sort()).toEqual(['avatar', 'college', 'id', 'name']);
    });

    it('reads only the caller’s own application', async () => {
        mockDb.clubApplication.findUnique.mockResolvedValue(null);
        await getMyApplication('c1');
        expect(mockDb.clubApplication.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { clubId_userId: { clubId: 'c1', userId: 'me' } } })
        );
    });
});

describe('the demo account', () => {
    it('is refused by every recruitment action', async () => {
        signInAs(DEMO_EMAIL);
        asClubRole('ADMIN');
        const results = await Promise.all([
            openRecruitment('c1', ['Why join?']),
            closeRecruitment('c1'),
            applyToClub('c1', ['a', 'b']),
            decideApplication('a1', 'ACCEPTED'),
            getMyApplication('c1'),
            getApplications('c1'),
        ]);
        for (const result of results) expect(result.success).toBe(false);
        expect(mockDb.club.updateMany).not.toHaveBeenCalled();
        expect(mockDb.clubApplication.create).not.toHaveBeenCalled();
        expect(mockDb.clubApplication.updateMany).not.toHaveBeenCalled();
    });
});

describe('signed out', () => {
    it('cannot apply', async () => {
        mockGetSession.mockResolvedValue(null);
        expect((await applyToClub('c1', ['a', 'b'])).success).toBe(false);
        expect(mockDb.clubApplication.create).not.toHaveBeenCalled();
    });
});
