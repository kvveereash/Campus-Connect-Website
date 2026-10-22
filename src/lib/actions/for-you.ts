'use server';

import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

/*
 * "For you" on the events board. The board is cached and the same for
 * everyone, so this returns only ids and a reason; the browser picks those
 * events out of the list it already has.
 *
 * Scoring is plain and explainable, because the reason is shown: a club you
 * are in beats your college, and either beats an interest that happens to be
 * in the title. An event you are already going to is never suggested.
 */

const CATEGORY_WORDS: Record<string, string[]> = {
    technology: ['code', 'coding', 'programming', 'software', 'web', 'app', 'ai', 'ml', 'machine learning', 'data', 'cloud', 'cyber', 'security', 'robotics', 'electronics', 'development', 'developer'],
    hackathon: ['code', 'coding', 'programming', 'hackathon', 'building', 'startup', 'product'],
    cultural: ['music', 'dance', 'drama', 'theatre', 'singing', 'film', 'poetry', 'literature', 'culture'],
    art: ['art', 'design', 'drawing', 'painting', 'photography', 'illustration'],
    workshop: ['learning', 'design', 'skills', 'writing'],
    sports: ['sports', 'football', 'cricket', 'basketball', 'fitness', 'athletics', 'badminton', 'chess'],
    business: ['business', 'entrepreneurship', 'finance', 'marketing', 'startup', 'management', 'economics'],
    social: ['networking', 'community', 'volunteering', 'social'],
};

type Pick = { id: string; reason: string };

export async function getEventsForYou(): Promise<Pick[]> {
    const session = await getSession();
    if (!session?.userId) return [];

    const now = new Date();
    const [me, events] = await Promise.all([
        prisma.user.findUnique({
            where: { id: session.userId },
            select: {
                collegeId: true,
                interests: { select: { name: true } },
                skills: { select: { name: true } },
                clubMemberships: { select: { clubId: true } },
                registrations: { where: { event: { date: { gte: now } } }, select: { eventId: true } },
            },
        }),
        prisma.event.findMany({
            where: { verified: true, deletedAt: null, date: { gte: now, lte: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000) } },
            orderBy: { date: 'asc' },
            take: 300,
            select: { id: true, title: true, description: true, category: true, clubId: true, hostCollegeId: true, club: { select: { name: true } } },
        }),
    ]);
    if (!me) return [];

    const clubs = new Set(me.clubMemberships.map((m) => m.clubId));
    const going = new Set(me.registrations.map((r) => r.eventId));
    const likes = [...me.interests, ...me.skills].map((x) => x.name.trim()).filter(Boolean);

    const scored = events
        .filter((e) => !going.has(e.id))
        .map((e) => {
            if (e.clubId && clubs.has(e.clubId)) return { id: e.id, score: 5, reason: `From ${e.club?.name ?? 'a club you are in'}` };

            const text = `${e.title} ${e.description.slice(0, 400)}`.toLowerCase();
            const catWords = CATEGORY_WORDS[e.category.trim().toLowerCase()] ?? [];
            const liked = likes.find((like) => {
                const l = like.toLowerCase();
                return text.includes(l) || catWords.some((w) => l.includes(w) || w.includes(l));
            });
            const sameCollege = !!me.collegeId && e.hostCollegeId === me.collegeId;

            if (liked && sameCollege) return { id: e.id, score: 4, reason: `At your college, for ${liked}` };
            if (liked) return { id: e.id, score: 3, reason: `Because you like ${liked}` };
            if (sameCollege) return { id: e.id, score: 2, reason: 'At your college' };
            return null;
        })
        .filter((x): x is Pick & { score: number } => x !== null);

    // Stable sort keeps the soonest first among equals (events came in date order).
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).map(({ id, reason }) => ({ id, reason }));
}
