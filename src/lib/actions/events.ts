'use server';

import prisma from '@/lib/db';
import { Event as PrismaEvent, Badge, Prisma } from '@prisma/client';
import { revalidatePath, updateTag } from 'next/cache';
import { getSession } from '@/lib/auth';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, CACHE_TTL } from '@/lib/cache';
import { isOk } from '@/lib/api-response';
import { createProtectedAction } from '@/lib/protected-action';
import { eventSchema, updateEventSchema, joinEventSchema } from '@/lib/schemas';
import { createNotification } from '@/lib/notification-helper';
import { audit } from '@/lib/audit';
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
// Badge Helper (internal, no auth needed)
// ─────────────────────────────────────────────────

export async function checkAndAwardBadges(userId: string, eventCategory: string) {
    const badgesEarned: Badge[] = [];

    try {
        const [
            registrationCount,
            hostedEventCount,
            existingUserBadges,
            allBadges
        ] = await Promise.all([
            prisma.eventRegistration.count({ where: { userId } }),
            eventCategory === 'HOST_EVENT'
                ? prisma.event.count({ where: { creatorId: userId } })
                : Promise.resolve(0),
            prisma.userBadge.findMany({
                where: { userId },
                select: { badge: { select: { name: true, id: true } } }
            }),
            prisma.badge.findMany({
                where: {
                    name: { in: ['Social Butterfly', 'Code Ninja', 'Event Planner'] }
                }
            })
        ]);

        const earnedBadgeNames = new Set(existingUserBadges.map(ub => ub.badge.name));
        const badgeMap = new Map(allBadges.map(b => [b.name, b]));
        const badgesToAward: { userId: string; badgeId: string }[] = [];

        if (registrationCount >= 5 && !earnedBadgeNames.has('Social Butterfly')) {
            const badge = badgeMap.get('Social Butterfly');
            if (badge) { badgesToAward.push({ userId, badgeId: badge.id }); badgesEarned.push(badge); }
        }

        if (eventCategory === 'Hackathon' && !earnedBadgeNames.has('Code Ninja')) {
            const badge = badgeMap.get('Code Ninja');
            if (badge) { badgesToAward.push({ userId, badgeId: badge.id }); badgesEarned.push(badge); }
        }

        if (eventCategory === 'HOST_EVENT' && hostedEventCount >= 1 && !earnedBadgeNames.has('Event Planner')) {
            const badge = badgeMap.get('Event Planner');
            if (badge) { badgesToAward.push({ userId, badgeId: badge.id }); badgesEarned.push(badge); }
        }

        if (badgesToAward.length > 0) {
            await prisma.userBadge.createMany({
                data: badgesToAward,
                skipDuplicates: true
            });
        }

        return badgesEarned;

    } catch (error) {
        console.error('Error awarding badges:', error);
        return [];
    }
}

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

    return { event };
}, {
    rateLimiter: eventLimiter,
    audit: { action: 'CREATE', entityType: 'Event', getEntityId: () => 'new' },
});

export const joinEventAction = createProtectedAction(joinEventSchema, async ({ eventId }, session) => {
    const userId = session.userId;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new Error('Event not found');

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

        await tx.event.update({
            where: { id: eventId },
            data: { registrationCount: { increment: 1 } }
        });

        return reg;
    });

    const earnedBadges = await checkAndAwardBadges(userId, event.category);

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

    // An approved event that changes goes back to the admin queue, or approval
    // would be a one-time check that any later edit walks around.
    if (event.verified && contentChanged(event, updateData)) {
        updateData.verified = false;
        updateData.verifiedBy = null;
        updateData.verifiedAt = null;
    }

    const updatedEvent = await prisma.event.update({
        where: { id },
        data: updateData
    });

    revalidatePath(`/events/${id}`);
    revalidatePath('/events');
    updateTag(`event-${id}`);
    updateTag(CACHE_TAGS.EVENTS);
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

async function _allEvents(filters?: { search?: string; category?: string }) {
    try {
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
            take: 50
        });

        return events;
    } catch (error) {
        console.error('Failed to fetch events:', error);
        return [];
    }
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

    if (search) return _allEvents(filters);

    const key = `events-list-${category ?? 'all'}`;
    return unstable_cache(() => _allEvents(filters), [key], {
        tags: [CACHE_TAGS.EVENTS],
        revalidate: CACHE_TTL.EVENTS_LIST,
    })();
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
    try {
        const events = await prisma.event.findMany({
            // Creators see their own events whether or not an admin has approved
            // them yet, so a pending event does not simply vanish.
            where: { creatorId: userId, deletedAt: null },
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

export async function getUserRegisteredEvents(userId: string) {
    try {
        const registrations = await prisma.eventRegistration.findMany({
            where: { userId },
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
        return await cached();
    } catch (error) {
        console.error(`Failed to fetch event ${id}:`, error);
        return null;
    }
}

export async function getEventsByHost(hostCollegeId: string): Promise<EventWithRelations[]> {
    try {
        const events = await prisma.event.findMany({
            where: { hostCollegeId, date: { gte: new Date() }, verified: true, deletedAt: null },
            orderBy: { date: 'asc' },
            include: {
                hostCollege: { select: { id: true, name: true, logo: true } },
            },
        });
        return events;
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
 * Delete an event (creator or admin only)
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

        const isCreator = event.creatorId === session.userId;
        const isClubAdmin = event.club?.members?.[0]?.role === 'ADMIN';

        if (!isCreator && !isClubAdmin) {
            await audit(
                session.userId as string,
                'PERMISSION_DENIED',
                'Event',
                eventId,
                { attemptedAction: 'DELETE', eventTitle: event.title }
            );
            return { success: false, error: 'Not authorized to delete this event' };
        }

        await prisma.$transaction(async (tx) => {
            await tx.eventReview.deleteMany({ where: { eventId } });
            await tx.eventRegistration.deleteMany({ where: { eventId } });
            await tx.teamRequest.deleteMany({ where: { eventId } });
            await tx.event.delete({ where: { id: eventId } });
        });

        await audit(
            session.userId as string,
            'DELETE',
            'Event',
            eventId,
            {
                eventTitle: event.title,
                deletedRegistrations: event._count.registrations,
                deletedTeamRequests: event._count.teamRequests,
                deletedReviews: event._count.reviews,
            }
        );

        revalidatePath('/events');
        revalidatePath('/profile');

        return { success: true, message: 'Event deleted successfully' };
    } catch (error) {
        console.error('Delete event error:', error);
        return { success: false, error: 'Failed to delete event' };
    }
}
