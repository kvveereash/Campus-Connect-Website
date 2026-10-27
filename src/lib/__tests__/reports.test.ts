/**
 * @jest-environment node
 *
 * Reporting and the admin queue: who may report what, that a repeat report
 * changes nothing, and that only an admin can resolve, with REMOVE taking
 * the content down the way the rest of the app does and DISMISS leaving it.
 */

const mockGetSession = jest.fn();
const mockCreateNotification = jest.fn();
const mockAudit = jest.fn();
const mockUpdateTag = jest.fn();
const mockDb = {
    event: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    post: { findUnique: jest.fn(), delete: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    comment: { findUnique: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
    club: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    user: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
    report: { upsert: jest.fn(), updateMany: jest.fn(), findMany: jest.fn() },
    // The array form: every write in it lands, and the results come back in order.
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
};

// A getter, because the imports below are hoisted above mockDb's initialiser.
jest.mock('@/lib/db', () => ({ __esModule: true, get default() { return mockDb; } }));
jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }));
jest.mock('@/lib/notification-helper', () => ({
    createNotification: (...a: unknown[]) => mockCreateNotification(...a),
}));
jest.mock('@/lib/audit', () => ({
    audit: (...a: unknown[]) => mockAudit(...a),
    toAuditJson: (v: unknown) => v,
}));
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
    updateTag: (...a: unknown[]) => mockUpdateTag(...a),
}));
jest.mock('@/lib/rate-limit', () => ({
    reportLimiter: undefined,
    checkRateLimit: jest.fn(async () => ({ success: true })),
    getRateLimitIdentifier: jest.fn(() => 'test'),
    getClientIp: jest.fn(async () => '127.0.0.1'),
}));

import { reportContent, resolveReports, getReportQueue } from '../actions/reports';
import { DEMO_EMAIL } from '../demo-account';

const asUser = (id: string, role: 'USER' | 'ADMIN' = 'USER') =>
    mockGetSession.mockResolvedValue({
        userId: id,
        user: { id, name: id, email: `${id}@college.edu`, role, avatar: null },
    });

beforeEach(() => {
    jest.clearAllMocks();
    mockDb.report.upsert.mockResolvedValue({ id: 'r1' });
    mockDb.report.updateMany.mockResolvedValue({ count: 2 });
    mockDb.event.update.mockResolvedValue({ id: 'e1' });
    mockCreateNotification.mockResolvedValue({ success: true });
    mockAudit.mockResolvedValue(undefined);
});

describe('reportContent', () => {
    it('refuses a report on your own post', async () => {
        asUser('me');
        mockDb.post.findUnique.mockResolvedValue({ content: 'hello', authorId: 'me', clubId: 'c1' });

        const result = await reportContent({ targetType: 'POST', targetId: 'p1', reason: 'SPAM' });

        expect(result.success).toBe(false);
        if (!result.success) expect(result.error).toMatch(/your own post/);
        expect(mockDb.report.upsert).not.toHaveBeenCalled();
    });

    it('refuses a report on yourself', async () => {
        asUser('me');
        mockDb.user.findUnique.mockResolvedValue({ name: 'Me', deletedAt: null });

        const result = await reportContent({ targetType: 'USER', targetId: 'me', reason: 'OTHER' });

        expect(result.success).toBe(false);
        expect(mockDb.report.upsert).not.toHaveBeenCalled();
    });

    it('refuses something that does not exist', async () => {
        asUser('me');
        mockDb.event.findUnique.mockResolvedValue(null);

        const result = await reportContent({ targetType: 'EVENT', targetId: 'gone', reason: 'MISLEADING' });

        expect(result.success).toBe(false);
        expect(mockDb.report.upsert).not.toHaveBeenCalled();
    });

    it('treats a repeat report as harmless: same answer, nothing rewritten', async () => {
        asUser('me');
        mockDb.post.findUnique.mockResolvedValue({ content: 'buy now', authorId: 'spammer', clubId: 'c1' });

        const first = await reportContent({ targetType: 'POST', targetId: 'p1', reason: 'SPAM', details: 'Ad' });
        const second = await reportContent({
            targetType: 'POST',
            targetId: 'p1',
            reason: 'HARASSMENT',
            details: 'changed my mind',
        });

        expect(first).toEqual(second);
        expect(first.success).toBe(true);
        for (const [args] of mockDb.report.upsert.mock.calls) {
            expect(args.where).toEqual({
                reporterId_targetType_targetId: { reporterId: 'me', targetType: 'POST', targetId: 'p1' },
            });
            // The unique row is created once; a second report updates nothing.
            expect(args.update).toEqual({});
        }
    });

    it('strips markup from the details', async () => {
        asUser('me');
        mockDb.comment.findUnique.mockResolvedValue({
            content: 'rude',
            authorId: 'them',
            postId: 'p1',
            post: { clubId: 'c1' },
        });

        await reportContent({
            targetType: 'COMMENT',
            targetId: 'k1',
            reason: 'HARASSMENT',
            details: '<b>mean</b> <script>x()</script>reply',
        });

        const [args] = mockDb.report.upsert.mock.calls[0];
        expect(args.create.details).toBe('mean reply');
    });

    it('keeps the demo account out', async () => {
        mockGetSession.mockResolvedValue({
            userId: 'demo',
            user: { id: 'demo', name: 'Demo', email: DEMO_EMAIL, role: 'USER', avatar: null },
        });

        const result = await reportContent({ targetType: 'POST', targetId: 'p1', reason: 'SPAM' });

        expect(result.success).toBe(false);
        expect(mockDb.report.upsert).not.toHaveBeenCalled();
    });
});

describe('resolveReports', () => {
    it('is closed to anyone who is not an admin', async () => {
        asUser('me');

        const result = await resolveReports('EVENT', 'e1', 'REMOVE');

        expect(result.success).toBe(false);
        if (!result.success) expect(result.code).toBe('FORBIDDEN');
        expect(mockDb.event.update).not.toHaveBeenCalled();
        expect(mockDb.report.updateMany).not.toHaveBeenCalled();
    });

    it('REMOVE soft-deletes an event, closes its reports as ACTION_TAKEN and tells the owner', async () => {
        asUser('admin', 'ADMIN');
        mockDb.event.findUnique.mockResolvedValue({
            title: 'Fake fest',
            creatorId: 'owner',
            clubId: 'c1',
            deletedAt: null,
        });

        const result = await resolveReports('EVENT', 'e1', 'REMOVE');

        expect(result).toEqual({ success: true, data: { closed: 2, removed: true, note: null } });
        expect(mockDb.event.update).toHaveBeenCalledWith({
            where: { id: 'e1' },
            data: { deletedAt: expect.any(Date) },
        });
        expect(mockDb.report.updateMany).toHaveBeenCalledWith({
            where: { targetType: 'EVENT', targetId: 'e1', status: 'OPEN' },
            data: { status: 'ACTION_TAKEN', resolvedAt: expect.any(Date), resolvedById: 'admin' },
        });
        expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
        expect(mockUpdateTag).toHaveBeenCalledWith('event-e1');
        expect(mockUpdateTag).toHaveBeenCalledWith('club-c1');
        expect(mockCreateNotification).toHaveBeenCalledWith(
            'owner',
            'admin',
            'SYSTEM',
            expect.stringContaining('Fake fest'),
            '/legal/guidelines'
        );
        expect(mockAudit).toHaveBeenCalledWith(
            'admin',
            'DELETE',
            'Event',
            'e1',
            expect.objectContaining({ decision: 'REMOVE', reportsClosed: 2 })
        );
    });

    it('DISMISS leaves the content alone and closes its reports as DISMISSED', async () => {
        asUser('admin', 'ADMIN');

        const result = await resolveReports('EVENT', 'e1', 'DISMISS');

        expect(result.success).toBe(true);
        expect(mockDb.event.update).not.toHaveBeenCalled();
        expect(mockDb.report.updateMany).toHaveBeenCalledWith({
            where: { targetType: 'EVENT', targetId: 'e1', status: 'OPEN' },
            data: { status: 'DISMISSED', resolvedAt: expect.any(Date), resolvedById: 'admin' },
        });
        expect(mockCreateNotification).not.toHaveBeenCalled();
    });

    it('REMOVE on a person closes the reports but never touches the account', async () => {
        asUser('admin', 'ADMIN');
        mockDb.user.findUnique.mockResolvedValue({ name: 'Someone', deletedAt: null });

        const result = await resolveReports('USER', 'u1', 'REMOVE');

        expect(result.success).toBe(true);
        if (result.success) expect(result.data.note).toMatch(/manual/);
        expect(mockDb.user.update).not.toHaveBeenCalled();
        expect(mockDb.user.delete).not.toHaveBeenCalled();
        expect(mockDb.report.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: 'ACTION_TAKEN' }) })
        );
        expect(mockCreateNotification).not.toHaveBeenCalled();
    });

    it('REMOVE on a comment deletes it and drops its post\'s count, like deletePostComment', async () => {
        asUser('admin', 'ADMIN');
        mockDb.comment.findUnique.mockResolvedValue({
            content: 'nasty',
            authorId: 'writer',
            postId: 'p1',
            post: { clubId: 'c1' },
        });
        mockDb.comment.delete.mockResolvedValue({});
        mockDb.post.update.mockResolvedValue({});

        await resolveReports('COMMENT', 'k1', 'REMOVE');

        expect(mockDb.comment.delete).toHaveBeenCalledWith({ where: { id: 'k1' } });
        expect(mockDb.post.update).toHaveBeenCalledWith({
            where: { id: 'p1' },
            data: { comments: { decrement: 1 } },
        });
        expect(mockUpdateTag).toHaveBeenCalledWith('club-c1');
        expect(mockCreateNotification).toHaveBeenCalledWith(
            'writer',
            'admin',
            'SYSTEM',
            expect.any(String),
            '/legal/guidelines'
        );
    });
});

describe('getReportQueue', () => {
    it('is closed to anyone who is not an admin', async () => {
        asUser('me');
        const result = await getReportQueue();
        expect(result.success).toBe(false);
        expect(mockDb.report.findMany).not.toHaveBeenCalled();
    });

    it('groups open reports by target, oldest first, with an excerpt and a link', async () => {
        asUser('admin', 'ADMIN');
        const at = (m: number) => new Date(Date.UTC(2026, 9, 1, 10, m));
        mockDb.report.findMany.mockResolvedValue([
            { targetType: 'POST', targetId: 'p1', reason: 'SPAM', details: null, createdAt: at(0) },
            { targetType: 'EVENT', targetId: 'e1', reason: 'MISLEADING', details: 'Not real', createdAt: at(1) },
            { targetType: 'POST', targetId: 'p1', reason: 'SPAM', details: 'Same ad again', createdAt: at(2) },
        ]);
        mockDb.post.findMany.mockResolvedValue([
            { id: 'p1', content: 'Buy followers', clubId: 'c1', author: { name: 'Ravi' }, club: { name: 'Robotics' } },
        ]);
        mockDb.event.findMany.mockResolvedValue([]);

        const result = await getReportQueue();

        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.map((g) => g.targetId)).toEqual(['p1', 'e1']);
        expect(result.data[0]).toMatchObject({
            count: 2,
            reasons: [{ reason: 'SPAM', count: 2 }],
            latestDetails: 'Same ad again',
            excerpt: 'Buy followers',
            href: '/clubs/c1',
        });
        // The event was already deleted: still listed, so its reports can be cleared.
        expect(result.data[1]).toMatchObject({ excerpt: null, href: null });
        // Nobody reported a club, comment or person, so those tables were not read.
        expect(mockDb.club.findMany).not.toHaveBeenCalled();
        expect(mockDb.comment.findMany).not.toHaveBeenCalled();
        expect(mockDb.user.findMany).not.toHaveBeenCalled();
    });
});
