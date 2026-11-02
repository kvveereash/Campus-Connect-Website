import 'server-only';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { createNotification } from '@/lib/notification-helper';

/*
 * Seats and the waitlist. An event with a `capacity` takes that many people
 * (free sign-ups and paid places); after that, new sign-ups wait in line.
 * When a seat frees up (someone cancels, or the organiser adds seats) the
 * longest-waiting person is moved up: straight in for a free event, or asked
 * to pay for a paid one.
 *
 * Every change runs inside a transaction that first locks the event's row,
 * so two people can never both take the last seat.
 */

type Tx = Prisma.TransactionClient;

/** Holds the event's row until the transaction ends; concurrent sign-ups queue behind it. */
export async function lockEvent(tx: Tx, eventId: string) {
    await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id" = ${eventId} FOR UPDATE`;
}

/*
 * How long an unpaid place on a paid event keeps its seat: from when it was
 * made, moved up from the waitlist, or sent to checkout (each of which
 * updates the row). Without a hold, every waitlist move-up saw the same seat
 * still free and moved up one more person, and a newcomer could take the
 * seat from someone just told it was theirs. After the hold the seat is
 * free again, and the next sign-up moves the waitlist up into it first.
 */
export const UNPAID_HOLD_MS = 12 * 60 * 60 * 1000;

/**
 * Seats in use: free sign-ups, paid places, and unpaid places still within
 * their hold. `except` leaves one place out, for asking "is there a seat
 * for this person" about someone who already holds one.
 */
export function seatsTaken(tx: Tx, eventId: string, { except, now = new Date() }: { except?: string; now?: Date } = {}) {
    return tx.eventRegistration.count({
        where: {
            eventId,
            ...(except ? { id: { not: except } } : {}),
            OR: [
                { status: { in: ['PAID', 'COMPLETED'] } },
                { status: 'PENDING_PAYMENT', updatedAt: { gt: new Date(now.getTime() - UNPAID_HOLD_MS) } },
            ],
        },
    });
}

/** Where someone stands in line, counting from 1. */
export async function waitlistPosition(tx: Tx, eventId: string, createdAt: Date) {
    return 1 + (await tx.eventRegistration.count({ where: { eventId, status: 'WAITLISTED', createdAt: { lt: createdAt } } }));
}

export type Promoted = { userId: string; mustPay: boolean };

/**
 * Moves people off the waitlist into free seats, oldest first. Call inside a
 * transaction that has locked the event. A paid event's promoted people get
 * a place to pay for, held for them (UNPAID_HOLD_MS); a free event's are in.
 */
export async function fillFromWaitlist(tx: Tx, event: { id: string; capacity: number | null; price: number }): Promise<Promoted[]> {
    const free = event.capacity === null ? Number.POSITIVE_INFINITY : event.capacity - (await seatsTaken(tx, event.id));
    if (free <= 0) return [];

    const next = await tx.eventRegistration.findMany({
        where: { eventId: event.id, status: 'WAITLISTED' },
        orderBy: { createdAt: 'asc' },
        take: Number.isFinite(free) ? free : 500,
        select: { id: true, userId: true },
    });
    if (next.length === 0) return [];

    const mustPay = event.price > 0;
    await tx.eventRegistration.updateMany({
        where: { id: { in: next.map((r) => r.id) }, status: 'WAITLISTED' },
        data: { status: mustPay ? 'PENDING_PAYMENT' : 'COMPLETED' },
    });
    if (!mustPay) {
        await tx.event.update({ where: { id: event.id }, data: { registrationCount: { increment: next.length } } });
    }
    return next.map((r) => ({ userId: r.userId, mustPay }));
}

/**
 * Tells each promoted person, after the transaction has committed. Sent in
 * the organiser's name ("Priya has a place for you at …"); an event with no
 * creator on record reads as from Campus Connect.
 */
export async function notifyPromoted(event: { id: string; title: string; creatorId: string | null }, promoted: Promoted[]) {
    await Promise.all(
        promoted.map((p) => {
            const message = p.mustPay
                ? `has a place for you at ${event.title}. Pay to confirm it before someone else does.`
                : `has a place for you at ${event.title}: you are off the waitlist and in.`;
            const link = `/events/${event.id}`;
            return event.creatorId
                ? createNotification(p.userId, event.creatorId, 'EVENT_UPDATE', message, link)
                : prisma.notification.create({ data: { recipientId: p.userId, type: 'EVENT_UPDATE', message, link } });
        }),
    );
}
