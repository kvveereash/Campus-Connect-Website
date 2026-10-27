import 'server-only';
import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';
import { CACHE_TAGS, CACHE_TTL } from '@/lib/cache';

/*
 * Reads for share images and the sitemap. Each selects only what a stranger may
 * see: approved, not deleted. The page reads (getEventById and friends) let a
 * creator or admin see pending rows, which is right for the page and wrong for
 * a picture a crawler caches, and they fetch far more than a card needs.
 */

const live = { verified: true, deletedAt: null } as const;

export const getEventShare = (id: string) =>
    unstable_cache(
        () =>
            prisma.event.findFirst({
                where: { id, ...live },
                select: {
                    title: true,
                    date: true,
                    venue: true,
                    category: true,
                    price: true,
                    thumbnail: true,
                    hostCollege: { select: { name: true } },
                },
            }),
        [`share-event-${id}`],
        { tags: [CACHE_TAGS.EVENTS, `event-${id}`], revalidate: CACHE_TTL.EVENTS_DETAIL }
    )();

export const getClubShare = (id: string) =>
    unstable_cache(
        () =>
            prisma.club.findFirst({
                where: { id, ...live },
                select: {
                    name: true,
                    logo: true,
                    category: true,
                    college: { select: { name: true } },
                    _count: { select: { members: true, events: { where: live } } },
                },
            }),
        [`share-club-${id}`],
        { tags: [CACHE_TAGS.CLUBS, `club-${id}`], revalidate: CACHE_TTL.CLUBS_DETAIL }
    )();

export const getCollegeShare = (id: string) =>
    unstable_cache(
        () =>
            prisma.college.findUnique({
                where: { id },
                select: {
                    name: true,
                    location: true,
                    _count: {
                        select: {
                            clubs: { where: live },
                            events: { where: { ...live, date: { gte: new Date() } } },
                        },
                    },
                },
            }),
        [`share-college-${id}`],
        {
            tags: [CACHE_TAGS.COLLEGES, CACHE_TAGS.CLUBS, CACHE_TAGS.EVENTS],
            revalidate: CACHE_TTL.COLLEGES,
        }
    )();

/** Every public detail page, for the sitemap. */
export async function getSitemapEntries() {
    const [events, clubs, colleges, fests] = await Promise.all([
        prisma.event.findMany({
            where: live,
            select: { id: true, date: true, verifiedAt: true },
            orderBy: { date: 'desc' },
            take: 5000,
        }),
        prisma.club.findMany({
            where: live,
            select: { id: true, updatedAt: true },
            take: 5000,
        }),
        prisma.college.findMany({ select: { id: true, updatedAt: true }, take: 5000 }),
        prisma.fest.findMany({
            where: { verified: true, deletedAt: null },
            select: { id: true, updatedAt: true, endDate: true },
            take: 2000,
        }),
    ]);
    return { events, clubs, colleges, fests };
}
