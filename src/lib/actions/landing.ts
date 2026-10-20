'use server';

import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';
import { clampLimit } from '@/lib/pagination';
import { CACHE_TAGS, CACHE_TTL } from '@/lib/cache';

/**
 * Everything the landing page renders, read from the database.
 *
 * The page previously ran on invented content: eight testimonials from people
 * who do not exist, a "Live Activity" ticker referring to events that were
 * never created, and headline metrics an order of magnitude above reality.
 * A landing page is the first thing anyone checks, so it is the worst place to
 * be caught making things up. Everything below is real or absent.
 */

/* The query functions below do not catch. Each one runs inside
   unstable_cache, and a fallback returned from in there is cached like real
   data: one transient database error used to blank the stats, categories or
   clubs for the full TTL after the database had recovered. The exported
   wrappers catch outside the cache instead, so a failure is never stored. */

export type LandingStats = {
    students: number;
    clubs: number;
    colleges: number;
    events: number;
    available: boolean;
};

async function _landingStats(): Promise<LandingStats> {
    const [students, clubs, colleges, events] = await Promise.all([
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.club.count({ where: { deletedAt: null, verified: true } }),
        prisma.college.count(),
        // Upcoming only: the page labels this "upcoming events", and the
        // events board it links to lists nothing in the past.
        prisma.event.count({ where: { deletedAt: null, verified: true, date: { gte: new Date() } } }),
    ]);
    return { students, clubs, colleges, events, available: true };
}

/**
 * Categories that actually have upcoming events, with a cover image borrowed
 * from one of them. A category with nothing in it is not offered.
 */
async function _categoryBand() {
    const events = await prisma.event.findMany({
        where: { date: { gte: new Date() }, verified: true, deletedAt: null },
        select: { category: true, thumbnail: true },
        orderBy: { date: 'asc' },
    });

    const map = new Map<string, { name: string; count: number; image: string | null }>();
    for (const e of events) {
        const existing = map.get(e.category);
        if (existing) {
            existing.count++;
            if (!existing.image) existing.image = e.thumbnail;
        } else {
            map.set(e.category, { name: e.category, count: 1, image: e.thumbnail });
        }
    }

    return [...map.values()].sort((a, b) => b.count - a.count);
}

/** The most-joined clubs, so the grid leads with the ones that are alive. */
async function _featuredClubs(limit = 6) {
    const clubs = await prisma.club.findMany({
        where: { verified: true, deletedAt: null },
        select: {
            id: true,
            name: true,
            category: true,
            logo: true,
            college: { select: { name: true } },
            // Live, approved events only, matching what the club page lists.
            _count: { select: { members: true, events: { where: { verified: true, deletedAt: null } } } },
        },
        orderBy: { members: { _count: 'desc' } },
        take: limit,
    });

    return clubs.map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        logo: c.logo,
        college: c.college?.name ?? null,
        members: c._count.members,
        events: c._count.events,
    }));
}

/**
 * The landing page runs all three of these on every request. The database URL
 * pins the pooler to a single connection, so they queue rather than run in
 * parallel — which is what made this page cost over a second before its first
 * byte. Cached, they cost nothing on a hit and still refresh within the minute.
 */
export async function getLandingStats(): Promise<LandingStats> {
    try {
        return await unstable_cache(_landingStats, ['landing-stats'], {
            tags: [CACHE_TAGS.EVENTS, CACHE_TAGS.CLUBS],
            revalidate: CACHE_TTL.EVENTS_LIST,
        })();
    } catch (error) {
        /* `available: false`, not four zeros. Zero is a claim about the
         * world; a count that could not be taken is not zero, so callers
         * render nothing rather than a number nobody measured. */
        console.error('Failed to load landing stats:', error);
        return { students: 0, clubs: 0, colleges: 0, events: 0, available: false };
    }
}

export async function getCategoryBand() {
    try {
        return await unstable_cache(_categoryBand, ['landing-categories'], {
            tags: [CACHE_TAGS.EVENTS],
            revalidate: CACHE_TTL.EVENTS_LIST,
        })();
    } catch (error) {
        console.error('Failed to load category band:', error);
        return [];
    }
}

export async function getFeaturedClubs(limit = 6) {
    limit = clampLimit(limit, 24, 6);
    try {
        return await unstable_cache(() => _featuredClubs(limit), [`landing-clubs-${limit}`], {
            tags: [CACHE_TAGS.CLUBS],
            revalidate: CACHE_TTL.CLUBS_LIST,
        })();
    } catch (error) {
        console.error('Failed to load featured clubs:', error);
        return [];
    }
}

export type CategoryBandItem = Awaited<ReturnType<typeof _categoryBand>>[number];
export type FeaturedClub = Awaited<ReturnType<typeof _featuredClubs>>[number];
