'use server';

import prisma from '@/lib/db';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache';

const EVENT_CARD = {
    hostCollege: { select: { id: true, name: true, logo: true } },
    club: { select: { id: true, name: true, logo: true } },
} as const;

/**
 * Everything a public profile page shows, in one database query.
 *
 * Deliberately excludes `email` and every other contact/credential field: this
 * page is readable by anonymous visitors, so returning emails here would hand
 * out the whole student directory to a scraper. Anything added to this select
 * becomes public — check each field against that bar first.
 *
 * One query, not three, because each one is expensive from production: the
 * functions run in Netlify's US region, the database is in Mumbai, and the
 * Supabase pooler makes Prisma wrap every statement in BEGIN / DEALLOCATE ALL /
 * COMMIT, so a single query is four trips across the world. The page used to
 * cost about 21 queries (~84 trips) and took ~10s on a first visit. With the
 * relationJoins preview feature (prisma/schema.prisma) Prisma fetches the user,
 * their relations, counts and both event lists in a single SQL statement.
 */
async function _loadPublicProfile(userId: string) {
    const user = await prisma.user.findFirst({
        where: { id: userId, deletedAt: null },
        select: {
            id: true,
            name: true,
            avatar: true,
            department: true,
            year: true,
            bio: true,
            achievements: true,
            projects: true,
            portfolioLinks: true,
            createdAt: true,
            college: {
                select: { id: true, name: true, logo: true, location: true },
            },
            skills: { select: { id: true, name: true } },
            interests: { select: { id: true, name: true } },
            badges: {
                select: {
                    dateEarned: true,
                    badge: { select: { id: true, name: true, icon: true, description: true } },
                },
                orderBy: { dateEarned: 'desc' },
            },
            // Only verified, non-deleted events: an unverified event is not
            // public yet. Unpaid and cancelled registrations are not places.
            registrations: {
                where: { status: { in: ['PAID', 'COMPLETED'] }, event: { deletedAt: null, verified: true } },
                select: { event: { include: EVENT_CARD } },
                orderBy: { createdAt: 'desc' },
                take: 12,
            },
            createdEvents: {
                where: { deletedAt: null, verified: true },
                include: EVENT_CARD,
                orderBy: { date: 'desc' },
                take: 12,
            },
            // Counted the way the lists are filtered. These counted
            // cancelled and unpaid registrations, deleted and rejected
            // events and deleted clubs, so "9 attending" sat above 3.
            _count: {
                select: {
                    registrations: {
                        where: { status: { in: ['PAID', 'COMPLETED'] }, event: { deletedAt: null, verified: true } },
                    },
                    createdEvents: { where: { deletedAt: null, verified: true } },
                    clubMemberships: { where: { club: { deletedAt: null, verified: true } } },
                },
            },
        },
    });

    if (!user) return null;

    // These three columns hold JSON strings written by the profile editor.
    // A malformed value should degrade to an empty list, not crash the page.
    const safeParse = (raw: string | null): any[] => {
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    const { registrations, createdEvents, ...profile } = user;
    return {
        profile: {
            ...profile,
            achievements: safeParse(profile.achievements),
            projects: safeParse(profile.projects),
            portfolioLinks: safeParse(profile.portfolioLinks),
            badges: profile.badges.map((ub) => ({ ...ub.badge, dateEarned: ub.dateEarned })),
        },
        registered: registrations.map((r) => r.event),
        hosted: createdEvents,
    };
}

/* Cached for a minute and tagged per user. The page, its metadata and both
   helpers below share this one entry, so a render costs at most one query.
   Errors are caught outside the cache so a failure is never stored as "not
   found". */
async function loadPublicProfile(userId: string) {
    try {
        return await unstable_cache(() => _loadPublicProfile(userId), [`public-profile-page-${userId}`], {
            tags: [CACHE_TAGS.USER, CACHE_TAGS.EVENTS, `user-${userId}`],
            revalidate: 60,
        })();
    } catch (error) {
        console.error('Failed to load public profile:', error);
        return undefined;
    }
}

export async function getPublicProfile(userId: string) {
    const page = await loadPublicProfile(userId);
    return page ? page.profile : null;
}

export type PublicProfile = NonNullable<Awaited<ReturnType<typeof getPublicProfile>>>;

/** Events this user has registered for, and events they created. */
export async function getPublicProfileEvents(userId: string) {
    const page = await loadPublicProfile(userId);
    return page ? { registered: page.registered, hosted: page.hosted } : { registered: [], hosted: [] };
}

/**
 * Headline counts for the landing page.
 *
 * These were previously hardcoded marketing numbers (12,000 students, 340
 * clubs, 50 colleges, 1,200 events) on a site with 14 users — the kind of
 * claim that does not survive being asked about. Real counts, rendered
 * honestly, are the better answer.
 */
export async function getPlatformStats() {
    try {
        const [students, clubs, colleges, events] = await Promise.all([
            prisma.user.count({ where: { deletedAt: null } }),
            prisma.club.count({ where: { deletedAt: null, verified: true } }),
            prisma.college.count(),
            prisma.event.count({ where: { deletedAt: null, verified: true } }),
        ]);

        return { students, clubs, colleges, events };
    } catch (error) {
        console.error('Failed to load platform stats:', error);
        return { students: 0, clubs: 0, colleges: 0, events: 0 };
    }
}
