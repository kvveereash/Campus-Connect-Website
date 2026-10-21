'use server';

import prisma from '@/lib/db';

export interface SearchResults {
    users: { id: string; name: string; avatar: string | null; department: string | null }[];
    events: { id: string; title: string; date: Date; category: string }[];
    clubs: { id: string; name: string; category: string }[];
}

/**
 * The command palette's search.
 *
 * Three bugs lived here.
 *
 * Every `contains` was missing `mode: 'insensitive'`, under a comment saying
 * case insensitivity was "default in SQLite usually, or adapt for Postgres
 * later". This app runs Postgres, where `contains` is case-sensitive — so
 * searching "spring" found nothing while "Spring" found the exhibition, and
 * "Art" returned one of the four events that match it. Lowercase is what
 * people actually type, so the search mostly appeared broken.
 *
 * Nothing filtered `deletedAt`, so deleted accounts, events and clubs would
 * be offered as results and lead to a 404 on the way out.
 *
 * Nothing filtered `verified`, so an event or club still sitting in the admin
 * approval queue was reachable through search — going around the queue that
 * the rest of the site enforces.
 *
 * `lowerQuery` was computed and never used, which is what a half-finished
 * attempt at the first bug looks like.
 */
export async function globalSearch(query: string): Promise<SearchResults> {
    // A public endpoint: anything may arrive here, and a huge term runs three
    // ILIKE scans.
    const term = typeof query === 'string' ? query.trim() : '';
    if (term.length < 2 || term.length > 100) {
        return { users: [], events: [], clubs: [] };
    }

    try {
        const [users, events, clubs] = await Promise.all([
            prisma.user.findMany({
                where: {
                    deletedAt: null,
                    OR: [
                        { name: { contains: term, mode: 'insensitive' } },
                        { department: { contains: term, mode: 'insensitive' } },
                    ],
                },
                take: 5,
                select: { id: true, name: true, avatar: true, department: true },
            }),
            prisma.event.findMany({
                where: {
                    deletedAt: null,
                    verified: true,
                    OR: [
                        { title: { contains: term, mode: 'insensitive' } },
                        { description: { contains: term, mode: 'insensitive' } },
                        { venue: { contains: term, mode: 'insensitive' } },
                    ],
                },
                orderBy: { date: 'asc' },
                take: 5,
                select: { id: true, title: true, date: true, category: true },
            }),
            prisma.club.findMany({
                where: {
                    deletedAt: null,
                    verified: true,
                    OR: [
                        { name: { contains: term, mode: 'insensitive' } },
                        { description: { contains: term, mode: 'insensitive' } },
                    ],
                },
                take: 5,
                select: { id: true, name: true, category: true },
            }),
        ]);

        return { users, events, clubs };
    } catch (error) {
        // Every other action in this codebase degrades to an empty result
        // rather than throwing into the client. The palette should close
        // quietly, not break the page it is floating over.
        console.error('Search failed:', error);
        return { users: [], events: [], clubs: [] };
    }
}
