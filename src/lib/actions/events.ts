'use server';

import prisma from '@/lib/db';
import { Event as PrismaEvent, Prisma } from '@prisma/client';
import { revalidatePath, updateTag } from 'next/cache';
import { getSession } from '@/lib/auth';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, CACHE_TTL } from '@/lib/cache';
import { clampLimit } from '@/lib/pagination';
import { isOk } from '@/lib/api-response';
import { createProtectedAction } from '@/lib/protected-action';
import { eventSchema, updateEventSchema, joinEventSchema } from '@/lib/schemas';
import { createNotification } from '@/lib/notification-helper';
import { audit } from '@/lib/audit';
import { checkAndAwardBadges } from '@/lib/badges';
import { eventLimiter } from '@/lib/rate-limit';

export type EventWithRelations = PrismaEvent & {
    hostCollege: {
        id: string;
        name: string;
        logo: string;
    };
    club?: {
        id: string;
        name: string;
        logo: string | null;
    } | null;
};

// ─────────────────────────────────────────────────
// Protected Actions (unified pattern)
// ─────────────────────────────────────────────────

/**
 * Note on the pair of invalidations below every write.
 *
 * revalidatePath clears the rendered route; it does not reach an
 * unstable_cache entry, and most of the reads in this file are wrapped in
 * one. Without the tag call a member who joins a club, or posts to it, waits
 * out the TTL before seeing their own change — the worst possible moment for
 * a cache to be doing its job. updateTag is the Server Action form that gives
 * read-your-own-writes, so both are needed and neither is redundant.
 */
export const createEventAction = createProtectedAction(eventSchema, async (data, session) => {
    let collegeId = data.hostCollegeId;

    if (data.clubId) {
        const club = await prisma.club.findUnique({ where: { id: data.clubId } });
        if (!club) throw new Error('Invalid club');

        const membership = await prisma.clubMember.findUnique({
            where: {
                userId_clubId: { userId: session.userId, clubId: data.clubId }
            }
        });

        if (!membership || membership.role !== 'ADMIN') {
            throw new Error('You must be a club admin to host events for this club.');
        }

        collegeId = club.collegeId;
    }

    if (!collegeId) {
        throw new Error('Host college could not be determined.');
    }

    const event = await prisma.event.create({
        data: {
            title: data.title,
            description: data.description,
            date: new Date(data.date),
            venue: data.venue,
            category: data.category,
            registrationCount: 0,
            price: data.price || 0,
            thumbnail: data.thumbnail || '/event-placeholder.png',
            hostCollege: { connect: { id: collegeId } },
            creator: { connect: { id: session.userId } },
            club: data.clubId ? { connect: { id: data.clubId } } : undefined
        }
    });

    await checkAndAwardBadges(session.userId, 'HOST_EVENT');

    revalidatePath('/events');
    revalidatePath('/');
    updateTag(CACHE_TAGS.EVENTS);
    // The club page lists its events from its own cache entry.
    if (data.clubId) updateTag(`club-${data.clubId}`);

    return { event };
}, {
    rateLimiter: eventLimiter,
    audit: { action: 'CREATE', entityType: 'Event', getEntityId: () => 'new' },
});

export const joinEventAction = createProtectedAction(joinEventSchema, async ({ eventId }, session) => {
    const userId = session.userId;

    // Only live, approved, upcoming events take registrations. Without this,
    // deleted, rejected, unapproved and past events could all be joined, and
    // each join counted towards badges (create your own unapproved
    // "Hackathon", join it, collect Code Ninja).
    const event = await prisma.event.findFirst({
        where: { id: eventId, deletedAt: null, verified: true, date: { gte: new Date() } }
    });
    if (!event) throw new Error('Event not found or not open for registration');

    const existingRegistration = await prisma.eventRegistration.findUnique({
        where: { userId_eventId: { userId, eventId } }
    });

    if (existingRegistration) throw new Error('Already registered');

    const registration = await prisma.$transaction(async (tx) => {
        const reg = await tx.eventRegistration.create({
            data: {
                userId,
                eventId,
                status: event.price > 0 ? 'PENDING_PAYMENT' : 'COMPLETED',
                amountPaid: 0
            }
        });

        // A paid event counts the place, and awards badges, once it is paid
        // (markRegistrationPaid). Counting at join let anyone collect badges
        // and inflate attendance by joining paid events and never paying.
        if (event.price <= 0) {
            await tx.event.update({
                where: { id: eventId },
                data: { registrationCount: { increment: 1 } }
            });
        }

        return reg;
    });

    const earnedBadges = event.price > 0 ? [] : await checkAndAwardBadges(userId, event.category);

    if (event.creatorId && event.creatorId !== userId) {
        await createNotification(
            event.creatorId,
            userId,
            'EVENT_JOIN',
            `registered for your event: ${event.title}`,
            `/events/${eventId}`
        );
    }

    revalidatePath('/events');
    revalidatePath(`/events/${eventId}`);
    revalidatePath('/profile');
    updateTag(`event-${eventId}`);
    updateTag(CACHE_TAGS.EVENTS);

    return { earnedBadges, registrationId: registration.id };
}, {
    audit: { action: 'UPDATE', entityType: 'Event', getEntityId: (d) => d.eventId },
});

function contentChanged(event: PrismaEvent, update: Prisma.EventUpdateInput) {
    return (Object.keys(update) as (keyof PrismaEvent & keyof Prisma.EventUpdateInput)[]).some((key) => {
        const before = event[key];
        const after = update[key];
        if (before instanceof Date && after instanceof Date) return before.getTime() !== after.getTime();
        return before !== after;
    });
}

export const updateEventAction = createProtectedAction(updateEventSchema, async ({ id, data }, session) => {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) throw new Error('Event not found');

    if (event.creatorId !== session.userId) {
        throw new Error('Unauthorized');
    }

    // Field by field, never a spread: the schema strips unknown keys, but this
    // is the line that decides what reaches the database.
    const updateData: Prisma.EventUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.venue !== undefined) updateData.venue = data.venue;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.thumbnail !== undefined) updateData.thumbnail = data.thumbnail;
    if (data.price !== undefined) updateData.price = data.price;

    // Any content change goes (back) to the admin queue. For an approved event
    // that stops approval being a one-time check later edits walk around; for
    // a rejected one, clearing the reason is what puts the fixed event back in
    // the queue, which lists only rows with no rejection reason. Previously a
    // rejected event stayed rejected however it was fixed.
    if ((event.verified || event.rejectionReason) && contentChanged(event, updateData)) {
        updateData.verified = false;
        updateData.verifiedBy = null;
        updateData.verifiedAt = null;
        updateData.rejectionReason = null;
    }

    const updatedEvent = await prisma.event.update({
        where: { id },
        data: updateData
    });

    revalidatePath(`/events/${id}`);
    revalidatePath('/events');
    updateTag(`event-${id}`);
    updateTag(CACHE_TAGS.EVENTS);
    if (event.clubId) updateTag(`club-${event.clubId}`);
    return { event: updatedEvent };
}, {
    audit: { action: 'UPDATE', entityType: 'Event', getEntityId: (d) => d.id },
});

// ─────────────────────────────────────────────────
// Legacy Wrappers (backward compatible)
// ─────────────────────────────────────────────────

/** @deprecated Use createEventAction directly */
export async function createEvent(data: {
    title: string;
    description: string;
    date: string;
    venue: string;
    hostCollegeId?: string;
    category: string;
    thumbnail: string;
    price?: number;
    creatorId?: string;
    clubId?: string;
}) {
    const result = await createEventAction({
        ...data,
        price: data.price ?? 0,
    });

    if (!isOk(result)) {
        return { success: false, error: result.error || 'Failed to create event' };
    }

    return { success: true, event: result.data.event };
}

/** @deprecated Use joinEventAction directly */
export async function joinEvent(userId: string, eventId: string) {
    const session = await getSession();
    if (!session || session.userId !== userId) return { success: false, error: 'Unauthorized' };

    const result = await joinEventAction({ eventId });
    if (!isOk(result)) return { success: false, error: result.error || 'Unknown error' };
    return { success: true, earnedBadges: result.data.earnedBadges, registrationId: result.data.registrationId };
}

/** @deprecated Use updateEventAction directly */
export async function updateEvent(eventId: string, data: Partial<PrismaEvent>) {
    const safeData: any = { ...data };
    if (safeData.date instanceof Date) safeData.date = safeData.date.toISOString();

    const result = await updateEventAction({ id: eventId, data: safeData });
    if (!isOk(result)) return { success: false, error: result.error || 'Unknown error' };
    return { success: true, event: result.data.event };
}

// ─────────────────────────────────────────────────
// Data Queries (no auth, cached)
// ─────────────────────────────────────────────────

async function _getUpcomingEventsUncached(limit: number = 3): Promise<EventWithRelations[]> {
    const events = await prisma.event.findMany({
        // Only approved, live events are public. The admin verification queue
        // existed but nothing filtered on `verified`, so every event went live
        // the moment it was created; soft-deleted events showed too.
        where: { date: { gte: new Date() }, verified: true, deletedAt: null },
        orderBy: { date: 'asc' },
        take: limit,
        include: {
            hostCollege: { select: { id: true, name: true, logo: true } },
            club: { select: { id: true, name: true, logo: true } },
        },
    });
    return events;
}

export async function getUpcomingEvents(limit: number = 3): Promise<EventWithRelations[]> {
    limit = clampLimit(limit, 24, 3);
    try {
        // The helper was already named "uncached" but nothing ever wrapped it,
        // so every request hit the database. The landing page calls this on
        // each load, which is where its 1.2s time-to-first-byte came from.
        const cached = unstable_cache(
            () => _getUpcomingEventsUncached(limit),
            [`upcoming-events-${limit}`],
            { tags: [CACHE_TAGS.EVENTS], revalidate: CACHE_TTL.EVENTS_LIST }
        );
        return await cached();
    } catch (error) {
        console.error('Failed to fetch upcoming events:', error);
        return [];
    }
}

// No try/catch here: an error caught inside unstable_cache would be cached as
// an empty board ("0 upcoming") for the whole TTL. getAllEvents catches.
async function _allEvents(filters?: { search?: string; category?: string }) {
    const { search, category } = filters || {};
    const where: any = { date: { gte: new Date() }, verified: true, deletedAt: null };

    if (search) {
        where.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { venue: { contains: search, mode: 'insensitive' } },
            { hostCollege: { name: { contains: search, mode: 'insensitive' } } }
        ];
    }

    if (category && category !== 'All') {
        where.category = category;
    }

    const events = await prisma.event.findMany({
        where,
        include: {
            hostCollege: { select: { id: true, name: true, logo: true } },
            club: { select: { id: true, name: true, logo: true } },
            _count: { select: { registrations: true } }
        },
        orderBy: { date: 'asc' },
        // The board derives its category counts from this list, so a low cap
        // made them disagree with the landing page once there were more
        // upcoming events than it.
        take: 300
    });

    return events;
}

/**
 * The events listing. This is the busiest page on the site and it had no
 * cache at all, so every visit cost a full query — and the database URL pins
 * the pooler to one connection, so those queries queue behind each other.
 *
 * Only the unfiltered listing is cached. Caching by search term would put a
 * separate entry in the cache for every string anyone ever typed, which is a
 * slow way to fill a cache with things nobody will ask for twice; a search is
 * also the one case where a visitor is watching for their own words to appear.
 * The listing refreshes within the minute either way, and publishing an event
 * revalidates the EVENTS tag immediately.
 */
export async function getAllEvents(filters?: { search?: string; category?: string }) {
    const { search, category } = filters || {};
    if (search && search.length > 100) return [];
    if (category && category.length > 50) return [];

    try {
        if (search) return await _allEvents(filters);

        const key = `events-list-${category ?? 'all'}`;
        return await unstable_cache(() => _allEvents(filters), [key], {
            tags: [CACHE_TAGS.EVENTS],
            revalidate: CACHE_TTL.EVENTS_LIST,
        })();
    } catch (error) {
        console.error('Failed to fetch events:', error);
        return [];
    }
}

/**
 * One event, with only the fields its pages actually render.
 *
 * This used to be `include: { creator: true, ... }`, which pulls the whole User
 * row — and since the detail page is a client component that takes the event as
 * a prop, React serialised that row into the HTML. Every visitor to an event
 * page was served the creator's email address and bcrypt password hash in the
 * page source. Relations are selected field by field from here on, so adding a
 * column to a model can never quietly publish it.
 */
async function _getEventByIdUncached(id: string) {
    const event = await prisma.event.findUnique({
        where: { id },
        select: {
            id: true,
            title: true,
            description: true,
            date: true,
            venue: true,
            category: true,
            price: true,
            thumbnail: true,
            verified: true,
            deletedAt: true,
            creatorId: true,
            clubId: true,
            hostCollegeId: true,
            hostCollege: { select: { id: true, name: true, logo: true } },
            club: { select: { id: true, name: true, logo: true } },
            creator: { select: { id: true, name: true, avatar: true } },
        },
    });
    return event;
}

export async function getUserCreatedEvents(userId: string) {
    // Creators see their own events whether or not an admin has approved them
    // yet, so a pending event does not simply vanish. Anyone else sees only the
    // approved ones: this is callable with any id, and used to hand out every
    // pending and rejected event (with its rejection reason) to whoever asked.
    const session = await getSession();
    const isOwner = session?.userId === userId;

    try {
        const events = await prisma.event.findMany({
            where: { creatorId: userId, deletedAt: null, ...(isOwner ? {} : { verified: true }) },
            include: {
                hostCollege: { select: { id: true, name: true, logo: true } },
                club: { select: { id: true, name: true, logo: true } },
                _count: { select: { registrations: true } }
            },
            orderBy: { date: 'desc' },
        });
        return events;
    } catch (error) {
        console.error('Failed to fetch user created events:', error);
        return [];
    }
}

/** The signed-in user's registrations. Takes no id, so it cannot list anyone else's. */
export async function getUserRegisteredEvents() {
    const session = await getSession();
    if (!session?.userId) return [];
    const userId = session.userId as string;

    try {
        const registrations = await prisma.eventRegistration.findMany({
            // Deleted events 404 when clicked, and unpaid registrations are
            // not places held; both were listed under "Registered".
            where: { userId, status: { in: ['PAID', 'COMPLETED'] }, event: { deletedAt: null } },
            include: {
                event: {
                    include: {
                        hostCollege: { select: { id: true, name: true, logo: true } },
                        club: { select: { id: true, name: true, logo: true } },
                        _count: { select: { registrations: true } }
                    }
                }
            },
            orderBy: { event: { date: 'desc' } },
        });
        return registrations.map((r: any) => r.event);
    } catch (error) {
        console.error('Failed to fetch user registered events:', error);
        return [];
    }
}

/** Exactly what getEventById returns — narrower than the list type on purpose. */
export type EventDetail = NonNullable<Awaited<ReturnType<typeof _getEventByIdUncached>>>;

export async function getEventById(id: string) {
    try {
        const cached = unstable_cache(
            () => _getEventByIdUncached(id),
            [`event-detail-${id}`],
            { tags: [CACHE_TAGS.EVENTS, `event-${id}`], revalidate: CACHE_TTL.EVENTS_DETAIL }
        );
        const event = await cached();
        if (!event || event.deletedAt) return null;

        // An event awaiting (or refused) approval is visible to its creator and
        // to admins only. This check sits outside the cache because the cache
        // entry is shared by every viewer; it used to be missing altogether, so
        // any pending or rejected event could be opened by URL.
        if (!event.verified) {
            const session = await getSession();
            const viewerId = session?.userId as string | undefined;
            if (viewerId !== event.creatorId && session?.user?.role !== 'ADMIN') return null;
        }

        return event;
    } catch (error) {
        console.error(`Failed to fetch event ${id}:`, error);
        return null;
    }
}

async function _eventsByHost(hostCollegeId: string): Promise<EventWithRelations[]> {
    return prisma.event.findMany({
        where: { hostCollegeId, date: { gte: new Date() }, verified: true, deletedAt: null },
        orderBy: { date: 'asc' },
        take: 60,
        include: {
            hostCollege: { select: { id: true, name: true, logo: true } },
        },
    });
}

export async function getEventsByHost(hostCollegeId: string): Promise<EventWithRelations[]> {
    try {
        return await unstable_cache(() => _eventsByHost(hostCollegeId), [`events-by-host-${hostCollegeId}`], {
            tags: [CACHE_TAGS.EVENTS],
            revalidate: CACHE_TTL.EVENTS_LIST,
        })();
    } catch (error) {
        console.error('Failed to fetch host events:', error);
        return [];
    }
}

async function _getUserBadgesUncached(userId: string) {
    const userBadges = await prisma.userBadge.findMany({
        where: { userId },
        include: { badge: true },
        orderBy: { dateEarned: 'desc' }
    });

    return userBadges.map(ub => ({
        ...ub.badge,
        earnedDate: ub.dateEarned
    }));
}

export async function getUserBadges(userId: string) {
    try {
        const cached = unstable_cache(
            () => _getUserBadgesUncached(userId),
            [`user-badges-${userId}`],
            { tags: [CACHE_TAGS.USER, `user-badges-${userId}`], revalidate: 60 }
        );
        return await cached();
    } catch (error) {
        console.error(`Failed to fetch badges for user ${userId}:`, error);
        return [];
    }
}

/**
 * Delete an event (creator, club admin or site admin)
 */
export async function deleteEvent(eventId: string) {
    const session = await getSession();
    if (!session || !session.userId) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                club: {
                    include: {
                        members: {
                            where: { userId: session.userId as string },
                            select: { role: true }
                        }
                    }
                },
                _count: {
                    select: { registrations: true, teamRequests: true, reviews: true }
                }
            }
        });

        if (!event) {
            return { success: false, error: 'Event not found' };
        }

        if (event.deletedAt) {
            return { success: false, error: 'Event not found' };
        }

        const isCreator = event.creatorId === session.userId;
        const isClubAdmin = event.club?.members?.[0]?.role === 'ADMIN';
        const isSiteAdmin = session.user?.role === 'ADMIN';

        if (!isCreator && !isClubAdmin && !isSiteAdmin) {
            await audit(
                session.userId as string,
                'PERMISSION_DENIED',
                'Event',
                eventId,
                { attemptedAction: 'DELETE', eventTitle: event.title }
            );
            return { success: false, error: 'Not authorized to delete this event' };
        }

        /* A soft delete, like the rest of the site. This was a hard delete
           that also removed every registration, including PAID ones: the only
           record tying a Stripe payment to an attendee went with it, so
           nobody could be refunded, and a later webhook found nothing. Every
           listing already filters on deletedAt. */
        await prisma.event.update({
            where: { id: eventId },
            data: { deletedAt: new Date() },
        });

        await audit(
            session.userId as string,
            'DELETE',
            'Event',
            eventId,
            {
                eventTitle: event.title,
                registrationsKept: event._count.registrations,
                teamRequests: event._count.teamRequests,
                reviews: event._count.reviews,
            }
        );

        revalidatePath('/events');
        revalidatePath('/profile');
        updateTag(`event-${eventId}`);
        updateTag(CACHE_TAGS.EVENTS);
        if (event.clubId) updateTag(`club-${event.clubId}`);

        return { success: true, message: 'Event deleted successfully' };
    } catch (error) {
        console.error('Delete event error:', error);
        return { success: false, error: 'Failed to delete event' };
    }
}
