'use server';

import prisma from '@/lib/db';
import { Event as PrismaEvent, Badge } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, CACHE_TTL } from '@/lib/cache';

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

// Internal helper
export async function checkAndAwardBadges(userId: string, eventCategory: string) {
    const badgesEarned: Badge[] = [];

    try {
        // 1. Social Butterfly: Register for 5 events
        const registrationCount = await prisma.eventRegistration.count({
            where: { userId }
        });

        if (registrationCount >= 5) {
            const socialBadge = await prisma.badge.findUnique({ where: { name: 'Social Butterfly' } });
            if (socialBadge) {
                const hasBadge = await prisma.userBadge.findUnique({
                    where: {
                        userId_badgeId: {
                            userId,
                            badgeId: socialBadge.id
                        }
                    }
                });

                if (!hasBadge) {
                    await prisma.userBadge.create({
                        data: {
                            userId,
                            badgeId: socialBadge.id
                        }
                    });
                    badgesEarned.push(socialBadge);
                }
            }
        }

        // 2. Code Ninja: Register for a Hackathon
        if (eventCategory === 'Hackathon') {
            const codeNinjaBadge = await prisma.badge.findUnique({ where: { name: 'Code Ninja' } });
            if (codeNinjaBadge) {
                const hasBadge = await prisma.userBadge.findUnique({
                    where: {
                        userId_badgeId: {
                            userId,
                            badgeId: codeNinjaBadge.id
                        }
                    }
                });

                if (!hasBadge) {
                    await prisma.userBadge.create({
                        data: {
                            userId,
                            badgeId: codeNinjaBadge.id
                        }
                    });
                    badgesEarned.push(codeNinjaBadge);
                }
            }
        }

        // 3. Event Planner: Host an event
        if (eventCategory === 'HOST_EVENT') {
            const hostedCount = await prisma.event.count({
                where: { creatorId: userId }
            });

            if (hostedCount >= 1) {
                const plannerBadge = await prisma.badge.findUnique({ where: { name: 'Event Planner' } });
                if (plannerBadge) {
                    const hasBadge = await prisma.userBadge.findUnique({
                        where: {
                            userId_badgeId: {
                                userId,
                                badgeId: plannerBadge.id
                            }
                        }
                    });

                    if (!hasBadge) {
                        await prisma.userBadge.create({
                            data: {
                                userId,
                                badgeId: plannerBadge.id
                            }
                        });
                        badgesEarned.push(plannerBadge);
                    }
                }
            }
        }

        return badgesEarned;

    } catch (error) {
        console.error('Error awarding badges:', error);
        return [];
    }
}

// Internal uncached query
async function _getUpcomingEventsUncached(limit: number = 3): Promise<EventWithRelations[]> {
    const events = await prisma.event.findMany({
        where: {
            date: {
                gte: new Date(),
            },
        },
        orderBy: {
            date: 'asc',
        },
        take: limit,
        include: {
            hostCollege: {
                select: {
                    id: true,
                    name: true,
                    logo: true,
                },
            },
            club: {
                select: {
                    id: true,
                    name: true,
                    logo: true,
                },
            },
        },
    });
    return events;
}

// Cached version - 60 second TTL
export async function getUpcomingEvents(limit: number = 3): Promise<EventWithRelations[]> {
    try {
        const cached = unstable_cache(
            () => _getUpcomingEventsUncached(limit),
            [`upcoming-events-${limit}`],
            {
                tags: [CACHE_TAGS.EVENTS],
                revalidate: CACHE_TTL.EVENTS_LIST,
            }
        );
        return await cached();
    } catch (error) {
        console.error('Failed to fetch upcoming events:', error);
        return [];
    }
}

export async function getAllEvents(filters?: { search?: string; category?: string }) {
    try {
        const { search, category } = filters || {};
        const where: any = {
            date: {
                gte: new Date(),
            },
        };

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
            select: {
                id: true,
                title: true,
                description: true,
                date: true,
                venue: true,
                category: true,
                thumbnail: true,
                price: true,
                registrationCount: true,
                hostCollege: {
                    select: {
                        id: true,
                        name: true,
                        logo: true
                    }
                },
                club: {
                    select: {
                        id: true,
                        name: true,
                        logo: true
                    }
                },
                _count: {
                    select: { registrations: true }
                }
            },
            orderBy: { date: 'asc' },
            take: 50 // Limit to 50 events for performance
        });

        return events;
    } catch (error) {
        console.error('Failed to fetch events:', error);
        return [];
    }
}

export async function getEventById(id: string) {
    try {
        const event = await prisma.event.findUnique({
            where: { id },
            include: {
                hostCollege: true,
                creator: true,
                club: true,
            },
        });
        return event;
    } catch (error) {
        console.error(`Failed to fetch event ${id}:`, error);
        return null;
    }
}

import { z } from 'zod';
import { createSafeAction } from '@/lib/safe-action';
import { eventSchema, updateEventSchema } from '@/lib/schemas';
import { createNotification } from '@/lib/actions/notifications';

export const createEventSafe = createSafeAction(eventSchema, async (data) => {
    const session = await getSession();
    if (!session || !session.userId) {
        throw new Error('Unauthorized');
    }

    // Validate club if provided
    let collegeId = data.hostCollegeId;
    if (data.clubId) {
        const club = await prisma.club.findUnique({ where: { id: data.clubId } });
        if (!club) throw new Error('Invalid club');

        // Check if user is admin of the club (security check)
        const membership = await prisma.clubMember.findUnique({
            where: {
                userId_clubId: {
                    userId: session.userId as string,
                    clubId: data.clubId
                }
            }
        });

        if (!membership || membership.role !== 'ADMIN') {
            throw new Error('You must be a club admin to host events for this club.');
        }

        collegeId = club.collegeId; // Infer college from club
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
            hostCollege: {
                connect: { id: collegeId }
            },
            creator: {
                connect: { id: session.userId as string }
            },
            club: data.clubId ? {
                connect: { id: data.clubId }
            } : undefined
        }
    });

    // Check for "Event Planner" badge
    await checkAndAwardBadges(session.userId as string, 'HOST_EVENT');

    revalidatePath('/events');
    revalidatePath('/'); // For landing page

    return { event };
});

export async function createEvent(data: {
    title: string;
    description: string;
    date: string; // ISO string
    venue: string;
    hostCollegeId?: string;
    category: string;
    thumbnail: string;
    price?: number;
    creatorId?: string;
    clubId?: string;
}) {
    // Legacy wrapper around safe action logic or kept for backward compatibility
    // For now, keeping original implementation or could wrap safe action
    // to strictly follow "Refactor" without breaking changes, we keep this as is
    // but typically we would migrate call sites.
    try {
        const session = await getSession();
        if (!session || !session.userId) {
            return { success: false, error: 'Unauthorized' };
        }

        // ... Logic duplicated for now to ensure safety while safe action is introduced
        // Ideally we refactor this to call the handler logic separated from the wrapper
        // But for this task, exposing createEventSafe is sufficient.

        // Re-using the manual logic from before for safety of existing calls:
        // Zod Validation
        const { eventSchema } = await import('@/lib/schemas');
        const validation = eventSchema.safeParse(data);
        if (!validation.success) {
            return { success: false, error: validation.error.issues[0].message };
        }

        // Copy-paste of logic or calling shared function. 
        // Start of original implementation...
        let collegeId = data.hostCollegeId;
        if (data.clubId) {
            const club = await prisma.club.findUnique({ where: { id: data.clubId } });
            if (!club) return { success: false, error: 'Invalid club' };

            const membership = await prisma.clubMember.findUnique({
                where: {
                    userId_clubId: {
                        userId: session.userId as string,
                        clubId: data.clubId
                    }
                }
            });

            if (!membership || membership.role !== 'ADMIN') {
                return { success: false, error: 'You must be a club admin to host events for this club.' };
            }

            collegeId = club.collegeId;
        }

        if (!collegeId) {
            return { success: false, error: 'Host college could not be determined.' };
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
                hostCollege: {
                    connect: { id: collegeId }
                },
                creator: {
                    connect: { id: session.userId as string }
                },
                club: data.clubId ? {
                    connect: { id: data.clubId }
                } : undefined
            }
        });

        await checkAndAwardBadges(session.userId as string, 'HOST_EVENT');

        revalidatePath('/events');
        revalidatePath('/');
        return { success: true, event };

    } catch (error) {
        console.error('Failed to create event:', error);
        return { success: false, error: 'Failed to create event' };
    }
}

export async function getCollegeById(id: string) {
    try {
        const college = await prisma.college.findUnique({
            where: { id },
            include: {
                events: {
                    include: {
                        hostCollege: true
                    },
                    orderBy: {
                        date: 'asc'
                    }
                },
                clubs: true // Include clubs
            }
        });
        return college;
    } catch (error) {
        console.error(`Failed to fetch college ${id}:`, error);
        return null;
    }
}

export async function getEventsByHost(hostCollegeId: string): Promise<EventWithRelations[]> {
    try {
        const events = await prisma.event.findMany({
            where: {
                hostCollegeId,
                date: {
                    gte: new Date(),
                },
            },
            orderBy: {
                date: 'asc',
            },
            include: {
                hostCollege: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                    },
                },
            },
        });
        return events;
    } catch (error) {
        console.error('Failed to fetch host events:', error);
        return [];
    }
}

export async function getUserBadges(userId: string) {
    try {
        const userBadges = await prisma.userBadge.findMany({
            where: { userId },
            include: {
                badge: true
            },
            orderBy: {
                dateEarned: 'desc'
            }
        });

        return userBadges.map(ub => ({
            ...ub.badge,
            earnedDate: ub.dateEarned
        }));
    } catch (error) {
        console.error(`Failed to fetch badges for user ${userId}:`, error);
        return [];
    }
}

import { joinEventSchema } from '@/lib/schemas';

export const joinEventSafe = createSafeAction(joinEventSchema, async ({ eventId }) => {
    const session = await getSession();
    if (!session || !session.userId) {
        throw new Error('Unauthorized');
    }
    const userId = session.userId as string;

    // 1. Check if event exists
    const event = await prisma.event.findUnique({
        where: { id: eventId }
    });

    if (!event) {
        throw new Error('Event not found');
    }

    // 2. Check if already registered
    const existingRegistration = await prisma.eventRegistration.findUnique({
        where: {
            userId_eventId: {
                userId,
                eventId
            }
        }
    });

    if (existingRegistration) {
        throw new Error('Already registered');
    }

    // 3. Register user transactionally
    const registration = await prisma.$transaction(async (tx) => {
        const reg = await tx.eventRegistration.create({
            data: {
                userId,
                eventId,
                status: event.price > 0 ? 'PENDING_PAYMENT' : 'COMPLETED',
                amountPaid: event.price > 0 ? 0 : 0 // Will be updated on actual payment
            }
        });

        await tx.event.update({
            where: { id: eventId },
            data: {
                registrationCount: {
                    increment: 1
                }
            }
        });

        return reg;
    });

    // 4. Check and award badges
    const earnedBadges = await checkAndAwardBadges(userId, event.category);

    // 5. Notify Host
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

    return { earnedBadges, registrationId: registration.id };
});

export async function joinEvent(userId: string, eventId: string) {
    const session = await getSession();
    if (!session || session.userId !== userId) return { success: false, error: 'Unauthorized' };

    const result = await joinEventSafe({ eventId });
    if (result.error || !result.data) return { success: false, error: result.error || 'Unknown error' };
    return { success: true, earnedBadges: result.data.earnedBadges, registrationId: result.data.registrationId };
}

export const updateEventSafe = createSafeAction(updateEventSchema, async ({ id, data }) => {
    const session = await getSession();
    if (!session || !session.userId) throw new Error('Unauthorized');

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) throw new Error('Event not found');

    if (event.creatorId !== session.userId) {
        throw new Error('Unauthorized');
    }

    const { date, ...otherData } = data;

    // Convert date string to Date object if present
    const updateData: any = { ...otherData };
    if (date) {
        updateData.date = new Date(date);
    }

    const updatedEvent = await prisma.event.update({
        where: { id },
        data: updateData
    });

    revalidatePath(`/events/${id}`);
    revalidatePath('/events');
    return { event: updatedEvent };
});

export async function updateEvent(eventId: string, data: Partial<PrismaEvent>) {
    // Adapter
    // Note: Legacy data might have Date object or string for date?
    // PrismaEvent usually has Date objects, but over wire form gives strings.
    // The safe schema expects string for date.
    // If 'data' has Date object, we might need to convert to string for schema validation.

    // Quick fix: bypass schema validation for legacy wrapper if types mismatch too much,
    // OR just use valid data.
    // Assuming 'data' comes from form which usually has strings.

    const safeData: any = { ...data };
    if (safeData.date instanceof Date) safeData.date = safeData.date.toISOString();

    const result = await updateEventSafe({ id: eventId, data: safeData });
    if (result.error || !result.data) return { success: false, error: result.error || 'Unknown error' };
    return { success: true, event: result.data.event };
}

export const completePaymentSafe = createSafeAction(
    z.object({ registrationId: z.string() }),
    async ({ registrationId }) => {
        const session = await getSession();
        if (!session || !session.userId) throw new Error('Unauthorized');

        const registration = await prisma.eventRegistration.findUnique({
            where: { id: registrationId }
        });

        if (!registration || registration.userId !== session.userId) {
            throw new Error('Registration not found');
        }

        // Simulate successful payment logic
        await prisma.eventRegistration.update({
            where: { id: registrationId },
            data: {
                status: 'PAID',
                amountPaid: 0, // In real life, get from Stripe
                paymentId: `sim_${Math.random().toString(36).substr(2, 9)}`
            }
        });

        revalidatePath('/events');
        revalidatePath(`/events/${registration.eventId}`);
        revalidatePath('/profile');

        return { success: true };
    }
);

export async function completePayment(registrationId: string) {
    const result = await completePaymentSafe({ registrationId });
    if (result.error) return { success: false, error: result.error };
    return { success: true };
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
        // Get the event to check ownership
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
                }
            }
        });

        if (!event) {
            return { success: false, error: 'Event not found' };
        }

        // Check authorization: must be creator or club admin
        const isCreator = event.creatorId === session.userId;
        const isClubAdmin = event.club?.members?.[0]?.role === 'ADMIN';

        if (!isCreator && !isClubAdmin) {
            return { success: false, error: 'Not authorized to delete this event' };
        }

        // Delete related registrations first
        await prisma.eventRegistration.deleteMany({
            where: { eventId }
        });

        // Delete team requests
        await prisma.teamRequest.deleteMany({
            where: { eventId }
        });

        // Delete the event
        await prisma.event.delete({
            where: { id: eventId }
        });

        revalidatePath('/events');
        revalidatePath('/profile');

        return { success: true, message: 'Event deleted successfully' };
    } catch (error) {
        console.error('Delete event error:', error);
        return { success: false, error: 'Failed to delete event' };
    }
}

