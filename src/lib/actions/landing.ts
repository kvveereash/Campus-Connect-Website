'use server';

import prisma from '@/lib/db';

/**
 * Everything the landing page renders, read from the database.
 *
 * The page previously ran on invented content: eight testimonials from people
 * who do not exist, a "Live Activity" ticker referring to events that were
 * never created, and headline metrics an order of magnitude above reality.
 * A landing page is the first thing anyone checks, so it is the worst place to
 * be caught making things up. Everything below is real or absent.
 */

export async function getLandingStats() {
    try {
        const [students, clubs, colleges, events] = await Promise.all([
            prisma.user.count({ where: { deletedAt: null } }),
            prisma.club.count({ where: { deletedAt: null, verified: true } }),
            prisma.college.count(),
            prisma.event.count({ where: { deletedAt: null, verified: true } }),
        ]);
        return { students, clubs, colleges, events };
    } catch (error) {
        console.error('Failed to load landing stats:', error);
        return { students: 0, clubs: 0, colleges: 0, events: 0 };
    }
}

/**
 * Categories that actually have upcoming events, with a cover image borrowed
 * from one of them. A category with nothing in it is not offered.
 */
export async function getCategoryBand() {
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
export async function getFeaturedClubs(limit = 6) {
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

export type LandingStats = Awaited<ReturnType<typeof getLandingStats>>;
export type CategoryBandItem = Awaited<ReturnType<typeof getCategoryBand>>[number];
export type FeaturedClub = Awaited<ReturnType<typeof getFeaturedClubs>>[number];
