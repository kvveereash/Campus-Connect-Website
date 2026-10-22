'use server';

import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

const GOING = ['PAID', 'COMPLETED'] as const;

export type GoingNearYou = { college: number; collegeName: string | null; clubs: number };

/**
 * How many people from your college, and from your clubs, are going to an
 * event. Counts only, never names: who is registered is for the organiser
 * to see. Signed out, or for an event that is not live, it is all zeros.
 */
export async function getGoingNearYou(eventId: string): Promise<GoingNearYou> {
    const none = { college: 0, collegeName: null, clubs: 0 };
    const session = await getSession();
    if (!session?.userId || typeof eventId !== 'string' || eventId.length > 50) return none;
    const me = session.userId as string;
    const collegeId = session.user?.collegeId || null;

    const [event, myClubs] = await Promise.all([
        prisma.event.findFirst({ where: { id: eventId, verified: true, deletedAt: null }, select: { id: true } }),
        prisma.clubMember.findMany({ where: { userId: me }, select: { clubId: true }, take: 100 }),
    ]);
    if (!event) return none;
    const clubIds = myClubs.map((m) => m.clubId);
    const base = { eventId, status: { in: [...GOING] }, userId: { not: me } };

    const [college, clubs, collegeRow] = await Promise.all([
        collegeId ? prisma.eventRegistration.count({ where: { ...base, user: { collegeId } } }) : 0,
        clubIds.length
            ? prisma.eventRegistration.count({
                  where: { ...base, user: { clubMemberships: { some: { clubId: { in: clubIds } } } } },
              })
            : 0,
        collegeId ? prisma.college.findUnique({ where: { id: collegeId }, select: { name: true } }) : null,
    ]);

    return { college, collegeName: collegeRow?.name ?? null, clubs };
}
