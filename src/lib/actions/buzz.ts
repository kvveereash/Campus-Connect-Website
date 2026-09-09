'use server';

import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';
import { CACHE_TAGS, CACHE_TTL } from '@/lib/cache';

/**
 * Campus Buzz — the cross-club feed.
 *
 * Posts belong to clubs (Post.clubId is required), so "campus buzz" is the
 * aggregate of what every verified club is posting, newest first. This reuses
 * the same Post rows the club pages write through createClubPost, rather than
 * inventing a parallel feed: a post made on a club page shows up here, and vice
 * versa.
 */
async function _buzzFeed(limit: number) {
    try {
        const posts = await prisma.post.findMany({
            where: {
                club: { verified: true, deletedAt: null },
            },
            orderBy: { timestamp: 'desc' },
            take: limit,
            select: {
                id: true,
                content: true,
                image: true,
                likes: true,
                timestamp: true,
                author: { select: { id: true, name: true, avatar: true } },
                club: { select: { id: true, name: true, logo: true, category: true } },
                _count: { select: { replies: true } },
            },
        });

        // `Post.comments` is a denormalised counter that nothing keeps in sync;
        // the actual reply rows are the truth, so report those.
        return posts.map((p) => ({
            id: p.id,
            content: p.content,
            image: p.image,
            likes: p.likes,
            timestamp: p.timestamp.toISOString(),
            author: p.author,
            club: p.club,
            commentCount: p._count.replies,
        }));
    } catch (error) {
        console.error('Failed to load buzz feed:', error);
        return [];
    }
}

/**
 * The feed was the slowest page left on the site, at roughly 240ms a view,
 * because the page is force-dynamic and this query ran on every request.
 *
 * It is cached now, tagged to clubs. Posts belong to clubs, and createClubPost
 * calls updateTag on that tag, so someone who posts sees their own post at
 * once; everyone else sees it within the minute. The page stays dynamic for
 * the session read that decides whether the composer appears at all.
 */
export async function getBuzzFeed(limit = 30) {
    return unstable_cache(() => _buzzFeed(limit), [`buzz-feed-${limit}`], {
        tags: [CACHE_TAGS.CLUBS, CACHE_TAGS.EVENTS],
        revalidate: CACHE_TTL.EVENTS_LIST,
    })();
}

export type BuzzPost = Awaited<ReturnType<typeof _buzzFeed>>[number];

/**
 * Clubs the signed-in user may post to.
 *
 * createClubPost rejects non-members, so the composer has to offer only the
 * user's own clubs — otherwise every post attempt would fail authorization.
 */
export async function getPostableClubs(userId: string) {
    try {
        const memberships = await prisma.clubMember.findMany({
            where: { userId, club: { verified: true, deletedAt: null } },
            select: { club: { select: { id: true, name: true } } },
            orderBy: { joinedAt: 'desc' },
        });

        return memberships.map((m) => m.club);
    } catch (error) {
        console.error('Failed to load postable clubs:', error);
        return [];
    }
}
