import 'server-only';
import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';
import { CACHE_TAGS } from '@/lib/cache';
import { FESTS_TAG, festTag } from './rules';

/*
 * The public fest reads. Both pages are the same for every visitor, so they
 * are cached and tagged; the per-person parts (saved or not, may edit) are
 * asked for by the browser. Dates leave here as ISO strings: unstable_cache
 * serialises to JSON, so a Date would come back a string anyway, and the
 * types now say what callers really get.
 */

/** Ended fests stay on the board this long, under "Recently ended". */
const ENDED_WINDOW_DAYS = 45;

export interface FestCard {
    id: string;
    name: string;
    tagline: string | null;
    startDate: string;
    endDate: string;
    coverImage: string | null;
    college: string;
    club: string | null;
    eventCount: number;
}

export interface TimetableEvent {
    id: string;
    title: string;
    date: string;
    venue: string;
    category: string;
    price: number;
}

export interface FestDetail extends FestCard {
    description: string;
    verified: boolean;
    collegeId: string;
    clubId: string | null;
    collegeLocation: string;
    events: TimetableEvent[];
}

const LIVE_EVENTS = { verified: true, deletedAt: null } as const;

async function readBoard(): Promise<FestCard[]> {
    const since = new Date(Date.now() - ENDED_WINDOW_DAYS * 86_400_000);
    const rows = await prisma.fest.findMany({
        where: { verified: true, deletedAt: null, endDate: { gte: since } },
        select: {
            id: true,
            name: true,
            tagline: true,
            startDate: true,
            endDate: true,
            coverImage: true,
            college: { select: { name: true } },
            club: { select: { name: true } },
            _count: { select: { events: { where: LIVE_EVENTS } } },
        },
        orderBy: { startDate: 'asc' },
        take: 120,
    });
    return rows.map((f) => ({
        id: f.id,
        name: f.name,
        tagline: f.tagline,
        startDate: f.startDate.toISOString(),
        endDate: f.endDate.toISOString(),
        coverImage: f.coverImage,
        college: f.college.name,
        club: f.club?.name ?? null,
        eventCount: f._count.events,
    }));
}

/** Approved fests from the last few weeks onwards, earliest first. */
export const getFestBoard = unstable_cache(readBoard, ['fest-board'], {
    tags: [FESTS_TAG],
    revalidate: 60,
});

async function readFest(id: string): Promise<FestDetail | null> {
    const f = await prisma.fest.findFirst({
        where: { id, deletedAt: null },
        select: {
            id: true,
            name: true,
            tagline: true,
            description: true,
            startDate: true,
            endDate: true,
            coverImage: true,
            verified: true,
            collegeId: true,
            clubId: true,
            college: { select: { name: true, location: true } },
            club: { select: { name: true } },
            events: {
                where: LIVE_EVENTS,
                select: { id: true, title: true, date: true, venue: true, category: true, price: true },
                orderBy: { date: 'asc' },
                take: 300,
            },
        },
    });
    if (!f) return null;
    return {
        id: f.id,
        name: f.name,
        tagline: f.tagline,
        description: f.description,
        startDate: f.startDate.toISOString(),
        endDate: f.endDate.toISOString(),
        coverImage: f.coverImage,
        verified: f.verified,
        collegeId: f.collegeId,
        clubId: f.clubId,
        college: f.college.name,
        collegeLocation: f.college.location,
        club: f.club?.name ?? null,
        eventCount: f.events.length,
        events: f.events.map((e) => ({ ...e, date: e.date.toISOString() })),
    };
}

/**
 * One fest and its approved events. Tagged with the events tag too: the
 * timetable changes whenever one of its events is approved, edited or
 * removed, and those writes already update that tag.
 */
export function getFest(id: string): Promise<FestDetail | null> {
    return unstable_cache(() => readFest(id), ['fest-detail', id], {
        tags: [FESTS_TAG, festTag(id), CACHE_TAGS.EVENTS],
        revalidate: 60,
    })();
}

export interface ManagedFest {
    id: string;
    name: string;
    tagline: string | null;
    description: string;
    startDate: string;
    endDate: string;
    coverImage: string | null;
    verified: boolean;
    creatorId: string | null;
    clubId: string | null;
    college: string;
    club: string | null;
    events: (TimetableEvent & { verified: boolean })[];
}

/**
 * A fest as its organisers see it, pending events included. Not cached: it
 * is read only on the edit page, after the permission check.
 */
export async function getFestForManaging(id: string): Promise<ManagedFest | null> {
    const f = await prisma.fest.findFirst({
        where: { id, deletedAt: null },
        select: {
            id: true,
            name: true,
            tagline: true,
            description: true,
            startDate: true,
            endDate: true,
            coverImage: true,
            verified: true,
            creatorId: true,
            clubId: true,
            college: { select: { name: true } },
            club: { select: { name: true } },
            events: {
                where: { deletedAt: null },
                select: {
                    id: true,
                    title: true,
                    date: true,
                    venue: true,
                    category: true,
                    price: true,
                    verified: true,
                },
                orderBy: { date: 'asc' },
                take: 300,
            },
        },
    });
    if (!f) return null;
    return {
        id: f.id,
        name: f.name,
        tagline: f.tagline,
        description: f.description,
        startDate: f.startDate.toISOString(),
        endDate: f.endDate.toISOString(),
        coverImage: f.coverImage,
        verified: f.verified,
        creatorId: f.creatorId,
        clubId: f.clubId,
        college: f.college.name,
        club: f.club?.name ?? null,
        events: f.events.map((e) => ({ ...e, date: e.date.toISOString() })),
    };
}
