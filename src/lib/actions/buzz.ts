'use server';

import prisma from '@/lib/db';

/**
 * Campus Buzz — the cross-club feed.
 *
 * Posts belong to clubs (Post.clubId is required), so "campus buzz" is the
 * aggregate of what every verified club is posting, newest first. This reuses
 * the same Post rows the club pages write through createClubPost, rather than
 * inventing a parallel feed: a post made on a club page shows up here, and vice
 * versa.
 */
export async function getBuzzFeed(limit = 30) {
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

export type BuzzPost = Awaited<ReturnType<typeof getBuzzFeed>>[number];

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
