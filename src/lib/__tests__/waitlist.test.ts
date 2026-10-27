/**
 * @jest-environment node
 */

const mockNotify = jest.fn();
jest.mock('@/lib/db', () => ({ __esModule: true, default: { notification: { create: jest.fn() } } }));
jest.mock('@/lib/notification-helper', () => ({ createNotification: (...a: unknown[]) => mockNotify(...a) }));

import type { Prisma } from '@prisma/client';
import { fillFromWaitlist, notifyPromoted } from '../waitlist';

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
