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

async function _landingStats() {
    try {
        const [students, clubs, colleges, events] = await Promise.all([
            prisma.user.count({ where: { deletedAt: null } }),
            prisma.club.count({ where: { deletedAt: null, verified: true } }),
            prisma.college.count(),
            // Upcoming only: the page labels this "upcoming events", and the
            // events board it links to lists nothing in the past.
            prisma.event.count({ where: { deletedAt: null, verified: true, date: { gte: new Date() } } }),
        ]);
        return { students, clubs, colleges, events, available: true };
    } catch (error) {
        /* `available: false`, not four zeros.
         *
         * This used to return { students: 0, clubs: 0, colleges: 0, events: 0 }
         * on failure, and the page printed them as facts. The deployed site is
         * doing exactly that right now — it cannot reach its database, so it
         * greets every visitor with "00 EVENTS · 00 CLUBS · 00 COLLEGES".
         *
         * Zero is a real number and a claim about the world. A count that
         * could not be taken is not zero, and a page whose whole argument is
         * that its figures are real cannot afford to guess. Callers render
         * nothing rather than a number nobody measured.
         */
        console.error('Failed to load landing stats:', error);
        return { students: 0, clubs: 0, colleges: 0, events: 0, available: false };
    }
}

/**
 * Categories that actually have upcoming events, with a cover image borrowed
 * from one of them. A category with nothing in it is not offered.
 */
async function _categoryBand() {
    try {
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
    } catch (error) {
        console.error('Failed to load category band:', error);
        return [];
    }
}

/** The most-joined clubs, so the grid leads with the ones that are alive. */
async function _featuredClubs(limit = 6) {
    try {
        const clubs = await prisma.club.findMany({
            where: { verified: true, deletedAt: null },
            select: {
                id: true,
                name: true,
                category: true,
                logo: true,
                college: { select: { name: true } },
                _count: { select: { members: true, events: true } },
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
    } catch (error) {
        console.error('Failed to load featured clubs:', error);
        return [];
    }
}

/**
 * The landing page runs all three of these on every request. The database URL
 * pins the pooler to a single connection, so they queue rather than run in
 * parallel — which is what made this page cost over a second before its first
 * byte. Cached, they cost nothing on a hit and still refresh within the minute.
 */
export async function getLandingStats() {
    return unstable_cache(_landingStats, ['landing-stats'], {
        tags: [CACHE_TAGS.EVENTS, CACHE_TAGS.CLUBS],
        revalidate: CACHE_TTL.EVENTS_LIST,
    })();
}

export async function getCategoryBand() {
    return unstable_cache(_categoryBand, ['landing-categories'], {
        tags: [CACHE_TAGS.EVENTS],
        revalidate: CACHE_TTL.EVENTS_LIST,
    })();
}

export async function getFeaturedClubs(limit = 6) {
    limit = clampLimit(limit, 24, 6);
    return unstable_cache(() => _featuredClubs(limit), [`landing-clubs-${limit}`], {
        tags: [CACHE_TAGS.CLUBS],
        revalidate: CACHE_TTL.CLUBS_LIST,
    })();
}

export type LandingStats = Awaited<ReturnType<typeof _landingStats>>;
export type CategoryBandItem = Awaited<ReturnType<typeof _categoryBand>>[number];
export type FeaturedClub = Awaited<ReturnType<typeof _featuredClubs>>[number];
