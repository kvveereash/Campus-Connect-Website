/**
 * @jest-environment node
 *
 * Giving up a place, when the place changes between the first read and the
 * lock: moved up off the waitlist by someone else's cancel, or paid for.
 */

const mockGetSession = jest.fn();
const mockFill = jest.fn();
const mockDb = {
    eventRegistration: { findUnique: jest.fn(), delete: jest.fn() },
    event: { update: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn((fn: (tx: unknown) => unknown): unknown => fn(mockDb)),
};

// Getters, because the imports below are hoisted above these initialisers.
jest.mock('@/lib/db', () => ({ __esModule: true, get default() { return mockDb; } }));
jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn(), updateTag: jest.fn(), unstable_cache: jest.fn() }));
jest.mock('@/lib/stripe', () => ({ closeCheckout: jest.fn() }));
jest.mock('@/lib/notification-helper', () => ({ createNotification: jest.fn() }));
jest.mock('@/lib/waitlist', () => ({
    lockEvent: jest.fn(),
    fillFromWaitlist: (...a: unknown[]) => mockFill(...a),
    notifyPromoted: jest.fn(),
    seatsTaken: jest.fn(),
    waitlistPosition: jest.fn(),
}));
jest.mock('@/lib/rate-limit', () => ({
    eventLimiter: undefined,
    checkRateLimit: jest.fn(async () => ({ success: true })),
    getRateLimitIdentifier: jest.fn(async () => 'test'),
}));

import { cancelRegistrationAction } from '../actions/events';

const EVENT = { id: 'e1', title: 'Hackathon', date: new Date(Date.now() + 86_400_000), creatorId: 'org', clubId: null };
const AT_LOCK = { capacity: 10, price: 0 };

beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({
        userId: 'me',
        user: { id: 'me', name: 'Me', email: 'me@x.edu', role: 'USER', avatar: null },
    });
    mockFill.mockResolvedValue([]);
});

function placeWas(before: string, atLock: string | null) {
    mockDb.eventRegistration.findUnique
        .mockResolvedValueOnce({ id: 'r1', status: before, paymentId: null, event: EVENT })
        .mockResolvedValueOnce(atLock ? { status: atLock, event: AT_LOCK } : null);
}

describe('cancelRegistrationAction', () => {
    it('counts a place moved up off the waitlist meanwhile as a seat, and passes it on', async () => {
        placeWas('WAITLISTED', 'COMPLETED');

        const result = await cancelRegistrationAction({ eventId: 'e1' });

        expect(result.success).toBe(true);
        expect(mockDb.eventRegistration.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
        expect(mockDb.event.update).toHaveBeenCalledWith({ where: { id: 'e1' }, data: { registrationCount: { decrement: 1 } } });
        expect(mockFill).toHaveBeenCalledWith(mockDb, { id: 'e1', ...AT_LOCK });
    });

    it('leaves a place that was paid for meanwhile to the organiser', async () => {
        placeWas('PENDING_PAYMENT', 'PAID');

        const result = await cancelRegistrationAction({ eventId: 'e1' });

        expect(result.success).toBe(false);
        expect(mockDb.eventRegistration.delete).not.toHaveBeenCalled();
    });

    it('passes on the seat an unpaid place was holding', async () => {
        placeWas('PENDING_PAYMENT', 'PENDING_PAYMENT');

        await cancelRegistrationAction({ eventId: 'e1' });

        expect(mockDb.event.update).not.toHaveBeenCalled();
        expect(mockFill).toHaveBeenCalled();
    });

    it('moves nobody up for a place that was only on the waitlist', async () => {
        placeWas('WAITLISTED', 'WAITLISTED');

        await cancelRegistrationAction({ eventId: 'e1' });

        expect(mockDb.eventRegistration.delete).toHaveBeenCalled();
        expect(mockFill).not.toHaveBeenCalled();
    });
});
