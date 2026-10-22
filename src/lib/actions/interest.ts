'use server';

import { z } from 'zod';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createProtectedAction } from '@/lib/protected-action';
import { isOk } from '@/lib/api-response';

/*
 * "Interested": a one-tap save that is lighter than registering. The event
 * id is the only input; who is saving always comes from the session.
 */

const eventIdSchema = z.object({ eventId: z.string().min(1).max(50) });

const toggleInterestAction = createProtectedAction(
    eventIdSchema,
    async ({ eventId }, session) => {
        // Only approved, live events can be saved.
        const event = await prisma.event.findFirst({
            where: { id: eventId, verified: true, deletedAt: null },
            select: { id: true },
        });
        if (!event) throw new Error('That event is not available.');

        const key = { userId_eventId: { userId: session.userId, eventId } };
        const existing = await prisma.eventInterest.findUnique({ where: key, select: { id: true } });
        if (existing) {
            await prisma.eventInterest.delete({ where: { id: existing.id } });
            return { interested: false };
        }
        // upsert, so a double tap cannot fail on the unique key.
        await prisma.eventInterest.upsert({
            where: key,
            create: { userId: session.userId, eventId },
            update: {},
        });
        return { interested: true };
    },
    // Saving is private to the account, so the shared demo may do it too.
    { allowDemo: true },
);

/** Save or unsave an event for the signed-in student. */
export async function toggleInterest(eventId: string): Promise<{ interested?: boolean; error?: string }> {
    const result = await toggleInterestAction({ eventId });
    return isOk(result) ? { interested: result.data.interested } : { error: result.error || 'Could not save that' };
}

/** Whether the signed-in student has saved this event; false when signed out. */
export async function isInterested(eventId: string): Promise<boolean> {
    const session = await getSession();
    if (!session?.userId || typeof eventId !== 'string' || eventId.length > 50) return false;
    const row = await prisma.eventInterest.findUnique({
        where: { userId_eventId: { userId: session.userId as string, eventId } },
        select: { id: true },
    });
    return Boolean(row);
}
