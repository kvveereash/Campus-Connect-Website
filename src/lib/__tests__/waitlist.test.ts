/**
 * @jest-environment node
 */

const mockNotify = jest.fn();
jest.mock('@/lib/db', () => ({ __esModule: true, default: { notification: { create: jest.fn() } } }));
jest.mock('@/lib/notification-helper', () => ({ createNotification: (...a: unknown[]) => mockNotify(...a) }));

import type { Prisma } from '@prisma/client';
import { fillFromWaitlist, notifyPromoted, seatsTaken, UNPAID_HOLD_MS } from '../waitlist';

function fakeTx(taken: number, waiting: { id: string; userId: string }[]) {
    const tx = {
        eventRegistration: {
            count: jest.fn().mockResolvedValue(taken),
            findMany: jest.fn(({ take }: { take: number }) => Promise.resolve(waiting.slice(0, take))),
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        event: { update: jest.fn().mockResolvedValue({}) },
    };
    return tx as unknown as Prisma.TransactionClient & typeof tx;
}

const LINE = [
    { id: 'r1', userId: 'u1' },
    { id: 'r2', userId: 'u2' },
    { id: 'r3', userId: 'u3' },
];

describe('fillFromWaitlist', () => {
    it('moves up as many people as there are free seats, oldest first, straight in for a free event', async () => {
        const tx = fakeTx(8, LINE);
        const promoted = await fillFromWaitlist(tx, { id: 'ev', capacity: 10, price: 0 });

        expect(promoted).toEqual([
            { userId: 'u1', mustPay: false },
            { userId: 'u2', mustPay: false },
        ]);
        expect(tx.eventRegistration.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ orderBy: { createdAt: 'asc' }, take: 2, where: { eventId: 'ev', status: 'WAITLISTED' } }),
        );
        expect(tx.eventRegistration.updateMany).toHaveBeenCalledWith({
            where: { id: { in: ['r1', 'r2'] }, status: 'WAITLISTED' },
            data: { status: 'COMPLETED' },
        });
        expect(tx.event.update).toHaveBeenCalledWith({ where: { id: 'ev' }, data: { registrationCount: { increment: 2 } } });
    });

    it('asks people to pay for a paid event, and counts no seat until they do', async () => {
        const tx = fakeTx(9, LINE);
        const promoted = await fillFromWaitlist(tx, { id: 'ev', capacity: 10, price: 250 });

        expect(promoted).toEqual([{ userId: 'u1', mustPay: true }]);
        expect(tx.eventRegistration.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'PENDING_PAYMENT' } }));
        expect(tx.event.update).not.toHaveBeenCalled();
    });

    it('moves nobody when the event is still full', async () => {
        const tx = fakeTx(10, LINE);
        expect(await fillFromWaitlist(tx, { id: 'ev', capacity: 10, price: 0 })).toEqual([]);
        expect(tx.eventRegistration.findMany).not.toHaveBeenCalled();
    });

    it('lets everyone in when the limit is removed', async () => {
        const tx = fakeTx(50, LINE);
        const promoted = await fillFromWaitlist(tx, { id: 'ev', capacity: null, price: 0 });
        expect(promoted.map((p) => p.userId)).toEqual(['u1', 'u2', 'u3']);
    });
});

describe('seatsTaken', () => {
    const NOW = new Date('2026-11-02T10:00:00Z');

    it('counts free and paid places, and unpaid ones only within their hold', async () => {
        const tx = fakeTx(0, []);
        await seatsTaken(tx, 'ev', { now: NOW });
        expect(tx.eventRegistration.count).toHaveBeenCalledWith({
            where: {
                eventId: 'ev',
                OR: [
                    { status: { in: ['PAID', 'COMPLETED'] } },
                    { status: 'PENDING_PAYMENT', updatedAt: { gt: new Date(NOW.getTime() - UNPAID_HOLD_MS) } },
                ],
            },
        });
    });

    it('can leave out the place asking, so its own hold is not held against it', async () => {
        const tx = fakeTx(0, []);
        await seatsTaken(tx, 'ev', { except: 'r9', now: NOW });
        expect(tx.eventRegistration.count).toHaveBeenCalledWith({ where: expect.objectContaining({ id: { not: 'r9' } }) });
    });

    it('moves up nobody more while someone already moved up still holds the last seat', async () => {
        // 9 paid + 1 promoted and unpaid, within its hold: counted as 10.
        const tx = fakeTx(10, LINE);
        expect(await fillFromWaitlist(tx, { id: 'ev', capacity: 10, price: 250 })).toEqual([]);
    });
});

describe('notifyPromoted', () => {
    beforeEach(() => mockNotify.mockReset());

    it('tells each person in the organiser’s name, with what to do next', async () => {
        await notifyPromoted({ id: 'ev', title: 'Demo Night', creatorId: 'org' }, [
            { userId: 'u1', mustPay: false },
            { userId: 'u2', mustPay: true },
        ]);
        expect(mockNotify).toHaveBeenCalledWith('u1', 'org', 'EVENT_UPDATE', expect.stringContaining('you are off the waitlist and in'), '/events/ev');
        expect(mockNotify).toHaveBeenCalledWith('u2', 'org', 'EVENT_UPDATE', expect.stringContaining('Pay to confirm'), '/events/ev');
    });
});
