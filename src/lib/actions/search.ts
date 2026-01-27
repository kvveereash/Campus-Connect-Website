'use server';

import prisma from '@/lib/db';

export interface SearchResults {
    users: { id: string; name: string; avatar: string | null; department: string | null }[];
    events: { id: string; title: string; date: Date; category: string }[];
    clubs: { id: string; name: string; category: string }[];
}

export async function globalSearch(query: string): Promise<SearchResults> {
    if (!query || query.length < 2) {
        return { users: [], events: [], clubs: [] };
    }

    const lowerQuery = query.toLowerCase();

    const [users, events, clubs] = await Promise.all([
        prisma.user.findMany({
            where: {
                OR: [
                    { name: { contains: query } }, // Case insensitive by default in SQLite usually, or adapt for Postgres later
                    { department: { contains: query } }
                ]
            },
            take: 5,
            select: { id: true, name: true, avatar: true, department: true }
        }),
        prisma.event.findMany({
            where: {
                OR: [
                    { title: { contains: query } },
                    { description: { contains: query } }
                ]
            },
            take: 5,
            select: { id: true, title: true, date: true, category: true }
        }),
        prisma.club.findMany({
            where: {
                name: { contains: query }
            },
            take: 5,
            select: { id: true, name: true, category: true }
        })
    ]);

    return { users, events, clubs };
}
