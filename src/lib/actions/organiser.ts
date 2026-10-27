'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/db';
import { createProtectedAction } from '@/lib/protected-action';
import { createNotification } from '@/lib/notification-helper';
import { cleanUserText } from '@/lib/sanitize';
import { announceLimiter } from '@/lib/rate-limit';
import { canManageEvent, GOING } from '@/lib/ticket';

/*
 * The organiser's tools on the attendee page: tell everyone something, and
 * share the running of the event with co-organisers. Each action checks that
 * the caller runs this event; the shared demo account is refused by
 * createProtectedAction's default, so it can't message real attendees.
 */

const id = z.string().min(1).max(50);

async function managedEvent(eventId: string, session: { userId: string; user?: { role?: string } }) {
    const event = await prisma.event.findFirst({
        where: { id: eventId, deletedAt: null },
        select: { id: true, title: true, creatorId: true, clubId: true },
    });
    if (!event || !(await canManageEvent(event, session))) throw new Error('Only the organisers of this event can do that');
    return event;
}

/**
 * A short update ("Venue moved to Hall 3") to everyone going and everyone on
 * the waitlist, as a notification (and a push where they turned those on).
 */
export const announceToAttendeesAction = createProtectedAction(
    z.object({ eventId: id, message: z.string().min(1).max(500) }),
    async ({ eventId, message }, session) => {
        const event = await managedEvent(eventId, session);
        const text = cleanUserText(message);
        if (text.length < 3) throw new Error('Write a little more so people know what changed');

        const people = await prisma.eventRegistration.findMany({
            where: { eventId, status: { in: [...GOING, 'WAITLISTED'] }, userId: { not: session.userId } },
            select: { userId: true },
        });

        // In batches, so a big event doesn't open hundreds of connections at once.
        for (let i = 0; i < people.length; i += 25) {
            await Promise.all(
                people.slice(i, i + 25).map((p) =>
                    createNotification(p.userId, session.userId, 'EVENT_UPDATE', `posted an update for ${event.title}: ${text}`, `/events/${eventId}`),
                ),
            );
        }
        return { sent: people.length };
    },
    { rateLimiter: announceLimiter, audit: { action: 'UPDATE', entityType: 'Event', getEntityId: (d) => d.eventId } },
);

/**
 * Makes someone going to the event a co-organiser: they can check people in,
 * see the list and post updates. Only the creator (or a site admin) decides.
 * Picked from the attendee list, so no one is looked up by email.
 */
export const addCoOrganiserAction = createProtectedAction(
    z.object({ eventId: id, userId: id }),
    async ({ eventId, userId }, session) => {
        const event = await managedEvent(eventId, session);
        if (event.creatorId !== session.userId && session.user.role !== 'ADMIN') {
            throw new Error('Only the person who created the event can add organisers');
        }
        if (userId === event.creatorId) throw new Error('They already run this event');
        const going = await prisma.eventRegistration.findFirst({
            where: { eventId, userId, status: { in: [...GOING] } },
            select: { id: true },
        });
        if (!going) throw new Error('Pick someone who is going to the event');

        await prisma.eventOrganiser.upsert({
            where: { eventId_userId: { eventId, userId } },
            create: { eventId, userId },
            update: {},
        });
        await createNotification(userId, session.userId, 'EVENT_UPDATE', `made you a co-organiser of ${event.title}. You can now check people in.`, `/events/${eventId}/attendees`);
        revalidatePath(`/events/${eventId}/attendees`);
        return { added: true };
    },
    { audit: { action: 'UPDATE', entityType: 'Event', getEntityId: (d) => d.eventId } },
);

export const removeCoOrganiserAction = createProtectedAction(
    z.object({ eventId: id, userId: id }),
    async ({ eventId, userId }, session) => {
        const event = await managedEvent(eventId, session);
        if (event.creatorId !== session.userId && session.user.role !== 'ADMIN') {
            throw new Error('Only the person who created the event can remove organisers');
        }
        await prisma.eventOrganiser.deleteMany({ where: { eventId, userId } });
        revalidatePath(`/events/${eventId}/attendees`);
        return { removed: true };
    },
    { audit: { action: 'UPDATE', entityType: 'Event', getEntityId: (d) => d.eventId } },
);
