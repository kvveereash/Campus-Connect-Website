'use server';

import prisma from '@/lib/db';
import { revalidatePath, updateTag, unstable_cache } from 'next/cache';
import { getSession } from '@/lib/auth';
import { ActionState } from '@/types';
import { cleanUserText } from '@/lib/sanitize';
import { postLimiter, commentLimiter, eventLimiter, getRateLimitIdentifier, checkRateLimit } from '@/lib/rate-limit';
import { AuthenticationError, NotFoundError, ConflictError, AuthorizationError, ErrorHandler } from '@/lib/errors';
import { CACHE_TAGS, CACHE_TTL } from '@/lib/cache';
import { isOk } from '@/lib/api-response';

import { createProtectedAction } from '@/lib/protected-action';
import { clubSchema, joinClubSchema, leaveClubSchema, deleteClubSchema, clubPostSchema, commentSchema } from '@/lib/schemas';

// ─────────────────────────────────────────────────
// Protected Actions (using unified pattern)
// ─────────────────────────────────────────────────

/**
 * Note on the pair of invalidations below every write.
 *
 * revalidatePath clears the rendered route; it does not reach an
 * unstable_cache entry, and most of the reads in this file are wrapped in
 * one. Without the tag call a member who joins a club, or posts to it, waits
 * out the TTL before seeing their own change — the worst possible moment for
 * a cache to be doing its job. updateTag is the Server Action form that gives
 * read-your-own-writes, so both are needed and neither is redundant.
 */
export const createClubAction = createProtectedAction(clubSchema, async (data, session) => {
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) throw new Error('User not found');

    // Determine College ID: selection or new creation > user's college > error
    let targetCollegeId = data.collegeId;

    // If new college name provided, create it first
    if (!targetCollegeId && data.newCollegeName) {
        const existingCollege = await prisma.college.findFirst({
            where: { name: { equals: data.newCollegeName, mode: 'insensitive' } }
        });

        if (existingCollege) {
            targetCollegeId = existingCollege.id;
        } else {
            const newCollege = await prisma.college.create({
                data: {
                    name: data.newCollegeName,
                    location: 'Unknown Location',
                    description: `This college was added by a student from ${data.newCollegeName}.`,
                    logo: '/images/college-placeholder.png'
                }
            });
            targetCollegeId = newCollege.id;
        }
    }

    // Fallback to user's college
    if (!targetCollegeId) {
        targetCollegeId = user?.collegeId || undefined;
    }

    if (!targetCollegeId) throw new Error('College selection is required');

    const club = await prisma.club.create({
        data: {
            name: data.name,
            description: data.description,
            category: data.category,
            logo: data.logo || '/club-logo-placeholder.png',
            collegeId: targetCollegeId,
            members: {
                create: {
                    userId: user.id,
                    role: 'ADMIN'
                }
            }
        }
    });

    revalidatePath('/clubs');
    revalidatePath('/colleges');
    updateTag(CACHE_TAGS.CLUBS);
    return club;
}, {
    // Also bounds how fast anyone can add colleges through "my college is not listed".
    rateLimiter: eventLimiter,
    audit: { action: 'CREATE', entityType: 'Club', getEntityId: () => 'new' },
});

export const joinClubAction = createProtectedAction(joinClubSchema, async ({ clubId }, session) => {
    // Pending, rejected and deleted clubs could be joined by id.
    const club = await prisma.club.findFirst({ where: { id: clubId, verified: true, deletedAt: null }, select: { id: true } });
    if (!club) throw new NotFoundError('Club not found');

    const existingMember = await prisma.clubMember.findUnique({
        where: {
            userId_clubId: { userId: session.userId, clubId }
        }
    });

    if (existingMember) {
        throw new ConflictError('You are already a member of this club');
    }

    await prisma.clubMember.create({
        data: { userId: session.userId, clubId, role: 'MEMBER' }
    });

    revalidatePath(`/clubs/${clubId}`);
    updateTag(`club-${clubId}`);
    updateTag(CACHE_TAGS.CLUBS);
    revalidatePath('/clubs');
    revalidatePath('/profile');

    return { message: 'Joined club successfully' };
}, {
    audit: { action: 'UPDATE', entityType: 'Club', getEntityId: (d) => d.clubId },
});

export const leaveClubAction = createProtectedAction(leaveClubSchema, async ({ clubId }, session) => {
    const membership = await prisma.clubMember.findUnique({
        where: {
            userId_clubId: { userId: session.userId, clubId }
        }
    });

    if (!membership) {
        throw new NotFoundError('Not a member of this club');
    }

    if (membership.role === 'ADMIN') {
        throw new AuthorizationError('Admins cannot leave. Delete the club or transfer ownership.');
    }

    await prisma.clubMember.delete({
        where: {
            userId_clubId: { userId: session.userId, clubId }
        }
    });

    revalidatePath(`/clubs/${clubId}`);
    updateTag(`club-${clubId}`);
    updateTag(CACHE_TAGS.CLUBS);
    revalidatePath('/clubs');
    revalidatePath('/profile');

    return { message: 'Left club successfully' };
});

export const deleteClubAction = createProtectedAction(deleteClubSchema, async ({ clubId }, session) => {
    // Check if user is admin of the club
    const membership = await prisma.clubMember.findUnique({
        where: {
            userId_clubId: { userId: session.userId, clubId }
        }
    });

    if (!membership || membership.role !== 'ADMIN') {
        throw new AuthorizationError('You do not have permission to delete this club.');
    }

    // Perform deletion in a transaction
    await prisma.$transaction(async (tx) => {
        await tx.clubMember.deleteMany({ where: { clubId } });
        await tx.event.updateMany({ where: { clubId }, data: { clubId: null } });
        await tx.post.deleteMany({ where: { clubId } });
        await tx.club.delete({ where: { id: clubId } });
    });

    revalidatePath('/clubs');
    revalidatePath('/profile');
    // The club lists, the club page and the buzz feed are all unstable_cache
    // reads; without these the deleted club stayed listed for minutes.
    updateTag(CACHE_TAGS.CLUBS);
    updateTag(`club-${clubId}`);
    updateTag(CACHE_TAGS.EVENTS);

    return { message: 'Club deleted successfully' };
}, {
    audit: { action: 'DELETE', entityType: 'Club', getEntityId: (d) => d.clubId },
});

export const createClubPostAction = createProtectedAction(clubPostSchema, async ({ clubId, content, image }, session) => {
    // Check if member
    const membership = await prisma.clubMember.findUnique({
        where: {
            userId_clubId: { userId: session.userId, clubId }
        }
    });

    if (!membership) {
        throw new AuthorizationError('You must be a member to post.');
    }

    const sanitizedContent = cleanUserText(content);
    if (!sanitizedContent && !image) {
        throw new Error('Post cannot be empty');
    }

    const post = await prisma.post.create({
        data: {
            content: sanitizedContent,
            image,
            clubId,
            authorId: session.userId
        }
    });

    revalidatePath(`/clubs/${clubId}`);
    updateTag(`club-${clubId}`);
    updateTag(CACHE_TAGS.CLUBS);

    return { message: 'Post created', post };
}, {
    rateLimiter: postLimiter,
    audit: { action: 'CREATE', entityType: 'Post', getEntityId: () => 'new' },
});

// ─────────────────────────────────────────────────
// Legacy Wrappers (backward compatible with ActionState)
// ─────────────────────────────────────────────────

/** @deprecated Use createClubAction directly */
export async function createClub(data: {
    name: string;
    description: string;
    category: string;
    logo: string;
    collegeId?: string;
    newCollegeName?: string;
}): Promise<ActionState<any>> {
    const result = await createClubAction(data);
    if (!isOk(result)) {
        return { success: false, error: result.error || 'Failed to create club' };
    }
    return { success: true, message: 'Club created successfully', data: result.data };
}

/** @deprecated Use joinClubAction directly */
export async function joinClub(clubId: string): Promise<ActionState> {
    const result = await joinClubAction({ clubId });
    if (!isOk(result)) {
        return { success: false, error: result.error || 'Failed to join club' };
    }
    return { success: true, message: result.data.message };
}

/** @deprecated Use leaveClubAction directly */
export async function leaveClub(clubId: string): Promise<ActionState> {
    const result = await leaveClubAction({ clubId });
    if (!isOk(result)) {
        return { success: false, error: result.error || 'Failed to leave club' };
    }
    return { success: true, message: result.data.message };
}

/** @deprecated Use deleteClubAction directly */
export async function deleteClub(clubId: string): Promise<ActionState> {
    const result = await deleteClubAction({ clubId });
    if (!isOk(result)) {
        return { success: false, error: result.error || 'Failed to delete club' };
    }
    return { success: true, message: result.data.message };
}

/** @deprecated Use createClubPostAction directly */
export async function createClubPost(clubId: string, content: string, image?: string): Promise<ActionState<any>> {
    const result = await createClubPostAction({ clubId, content, image });
    if (!isOk(result)) {
        return { success: false, error: result.error || 'Failed to create post' };
    }
    return { success: true, message: result.data.message, data: result.data.post };
}

// ─────────────────────────────────────────────────
// Data Queries (no auth required, cached)
// ─────────────────────────────────────────────────

async function _getClubsUncached(filters?: { search?: string; category?: string }) {
    const { search, category } = filters || {};

    const where: any = {};

    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
        ];
    }

    if (category && category !== 'All') {
        where.category = category;
    }

    // Only approved, live clubs are public — the same rule the events listing
    // follows, and what the admin verification queue exists to enforce.
    where.verified = true;
    where.deletedAt = null;

    const clubs = await prisma.club.findMany({
        where,
        select: {
            id: true,
            name: true,
            description: true,
            category: true,
            logo: true,
            collegeId: true,
            createdAt: true,
            updatedAt: true,
            college: {
                select: { id: true, name: true }
            },
            _count: {
                // Events and posts say whether a club is actually alive, which
                // is more useful on a listing than its creation date.
                select: { members: true, events: true, posts: true }
            }
        },
        orderBy: [{ members: { _count: 'desc' } }, { createdAt: 'desc' }],
        take: 50
    });

    return clubs.map(club => ({
        ...club,
        createdAt: club.createdAt.toISOString(),
        updatedAt: club.updatedAt.toISOString()
    }));
}

export async function getClubs(filters?: { search?: string; category?: string }) {
    // A search is not cached (one entry per string anyone types, as with the
    // events listing) and is bounded.
    if (filters?.search) {
        if (filters.search.length > 100) return [];
        return _getClubsUncached(filters);
    }

    try {
        const cacheKey = `clubs-list-${JSON.stringify(filters || {})}`;
        const cached = unstable_cache(
            () => _getClubsUncached(filters),
            [cacheKey],
            {
                tags: [CACHE_TAGS.CLUBS],
                revalidate: CACHE_TTL.CLUBS_LIST,
            }
        );
        return await cached();
    } catch (error) {
        console.error('Failed to get clubs:', error);
        return [];
    }
}

async function _getClubDetailsUncached(clubId: string) {
    const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: {
            id: true,
            name: true,
            description: true,
            category: true,
            logo: true,
            createdAt: true,
            updatedAt: true,
            verified: true,
            rejectionReason: true,
            deletedAt: true,
            college: {
                select: { id: true, name: true, location: true }
            },
            // Approved, live events only: deleted and pending ones were listed
            // here and linked to pages that 404.
            events: {
                where: { verified: true, deletedAt: null },
                select: {
                    id: true, title: true, date: true,
                    category: true, thumbnail: true
                },
                orderBy: { date: 'desc' },
                take: 10
            },
            members: {
                select: {
                    id: true, role: true, joinedAt: true,
                    user: {
                        select: {
                            id: true, name: true, avatar: true,
                            department: true, year: true,
                            college: { select: { name: true } }
                        }
                    }
                },
                orderBy: { joinedAt: 'asc' }
            },
            _count: {
                select: { members: true, events: { where: { verified: true, deletedAt: null } } }
            }
        }
    });
    return club;
}

export async function getClubDetails(clubId: string) {
    try {
        const cached = unstable_cache(
            () => _getClubDetailsUncached(clubId),
            [`club-detail-${clubId}`],
            {
                tags: [CACHE_TAGS.CLUBS, `club-${clubId}`],
                revalidate: CACHE_TTL.CLUBS_DETAIL,
            }
        );
        const club = await cached();
        if (!club || club.deletedAt) return null;

        // A club awaiting (or refused) approval is visible to its members and
        // to site admins only, as unapproved events are. It used to be fully
        // public and joinable by URL. Checked outside the shared cache entry.
        if (!club.verified) {
            const session = await getSession();
            const viewerId = session?.userId as string | undefined;
            const isMember = !!viewerId && club.members.some((m) => m.user.id === viewerId);
            if (!isMember && session?.user?.role !== 'ADMIN') return null;
        }

        return club;
    } catch (error) {
        console.error('Error fetching club details:', error);
        throw error;
    }
}

/**
 * Whether the signed-in viewer may see a club's content: anyone for an
 * approved, live club; members and site admins otherwise. The club page
 * already gated this, but its posts and comments were readable (and
 * commentable) directly by id for pending, rejected and deleted clubs.
 */
async function canViewClub(clubId: string): Promise<boolean> {
    const club = await prisma.club.findUnique({ where: { id: clubId }, select: { verified: true, deletedAt: true } });
    if (!club || club.deletedAt) return false;
    if (club.verified) return true;
    const session = await getSession();
    if (!session?.userId) return false;
    if (session.user?.role === 'ADMIN') return true;
    const member = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: session.userId as string, clubId } },
        select: { id: true },
    });
    return !!member;
}

async function _clubPosts(clubId: string) {
    // No try/catch in here: an error caught inside unstable_cache returns []
    // and the cache keeps that empty feed for the whole TTL after one blip.
    const posts = await prisma.post.findMany({
        where: { clubId },
        orderBy: { timestamp: 'desc' },
        take: 50,
        include: {
            author: {
                select: { id: true, name: true, avatar: true }
            }
        }
    });

    return posts.map(post => ({
        ...post,
        timestamp: post.timestamp.toISOString()
    }));
}

/**
 * A club's feed. The club page already caches its details, so this was the
 * only query still running on every view of it. Tagged per club, so posting
 * to one club does not invalidate every other club's feed.
 */
export async function getClubPosts(clubId: string) {
    try {
        if (!(await canViewClub(clubId))) return [];
        return await unstable_cache(() => _clubPosts(clubId), [`club-posts-${clubId}`], {
            tags: [CACHE_TAGS.CLUBS, `club-${clubId}`],
            revalidate: CACHE_TTL.CLUBS_DETAIL,
        })();
    } catch (error) {
        console.error('Failed to get club posts:', error);
        return [];
    }
}

// ─────────────────────────────────────────────────
// Post & Comment Management (raw auth pattern — kept for now)
// ─────────────────────────────────────────────────

export async function deleteClubPost(postId: string, clubId: string): Promise<ActionState> {
    try {
        const session = await getSession();
        if (!session || !session.userId) {
            return { success: false, error: 'Unauthorized' };
        }

        const post = await prisma.post.findUnique({
            where: { id: postId },
            include: { club: { include: { members: true } } }
        });

        if (!post) {
            return { success: false, error: 'Post not found' };
        }

        const isAuthor = post.authorId === session.userId;
        const isClubAdmin = post.club.members.some(m => m.userId === session.userId && m.role === 'ADMIN' && m.clubId === clubId);

        if (!isAuthor && !isClubAdmin) {
            return { success: false, error: 'You do not have permission to delete this post.' };
        }

        await prisma.post.delete({ where: { id: postId } });

        revalidatePath(`/clubs/${clubId}`);
        updateTag(`club-${clubId}`);
        updateTag(CACHE_TAGS.CLUBS);
        return { success: true, message: 'Post deleted' };
    } catch (error) {
        console.error('Failed to delete post:', error);
        return { success: false, error: 'Failed to delete post' };
    }
}

export async function editClubPost(postId: string, clubId: string, newContent: string): Promise<ActionState> {
    const parsed = clubPostSchema.shape.content.safeParse(newContent);
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid post' };
    }

    try {
        const session = await getSession();
        if (!session || !session.userId) {
            return { success: false, error: 'Unauthorized' };
        }

        const post = await prisma.post.findUnique({ where: { id: postId } });
        if (!post) return { success: false, error: 'Post not found' };

        if (post.authorId !== session.userId) {
            return { success: false, error: 'Only the author can edit this post' };
        }

        const sanitizedContent = cleanUserText(parsed.data);
        if (!sanitizedContent) return { success: false, error: 'Post cannot be empty' };

        await prisma.post.update({
            where: { id: postId },
            data: { content: sanitizedContent }
        });

        // The post's own club, not the one the caller named.
        revalidatePath(`/clubs/${post.clubId}`);
        updateTag(`club-${post.clubId}`);
        updateTag(CACHE_TAGS.CLUBS);
        return { success: true, message: 'Post updated' };
    } catch (error) {
        console.error('Failed to edit post:', error);
        return { success: false, error: 'Failed to edit post' };
    }
}

// --- Comments ---

export async function createPostComment(postId: string, content: string): Promise<ActionState> {
    const parsed = commentSchema.safeParse({ postId, content });
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid comment' };
    }

    try {
        const session = await getSession();
        if (!session || !session.userId) {
            return { success: false, error: 'Unauthorized' };
        }

        // Rate limiting
        const identifier = getRateLimitIdentifier(session.userId as string);
        const rateLimit = await checkRateLimit(commentLimiter, identifier);

        if (!rateLimit.success) {
            return {
                success: false,
                error: `Slow down! Please wait a moment before commenting again.`
            };
        }

        const post = await prisma.post.findUnique({
            where: { id: postId },
            include: { club: true }
        });

        if (!post || !(await canViewClub(post.clubId))) return { success: false, error: 'Post not found' };

        const sanitizedContent = cleanUserText(parsed.data.content);
        if (!sanitizedContent) return { success: false, error: 'Comment cannot be empty' };

        await prisma.$transaction([
            prisma.comment.create({
                data: {
                    content: sanitizedContent,
                    postId,
                    authorId: session.userId
                }
            }),
            prisma.post.update({
                where: { id: postId },
                data: { comments: { increment: 1 } }
            }),
        ]);

        // Notify post author
        if (post.authorId !== session.userId) {
            const { createNotification } = await import('@/lib/notification-helper');
            await createNotification(
                post.authorId,
                session.userId,
                'COMMENT',
                'commented on your post',
                `/clubs/${post.clubId}`
            );
        }

        revalidatePath(`/clubs/${post.clubId}`);
        updateTag(`club-${post.clubId}`);
        updateTag(CACHE_TAGS.CLUBS);
        return { success: true, message: 'Comment added' };
    } catch (error) {
        console.error('[createPostComment] ERROR:', error);
        // Not the raw error: that sent Prisma's internals to the browser.
        return { success: false, error: 'Failed to create comment' };
    }
}

export async function getPostComments(postId: string) {
    try {
        const post = await prisma.post.findUnique({ where: { id: postId }, select: { clubId: true } });
        if (!post || !(await canViewClub(post.clubId))) return { success: false, error: 'Post not found' };

        const comments = await prisma.comment.findMany({
            where: { postId },
            include: {
                author: {
                    select: { id: true, name: true, avatar: true }
                }
            },
            orderBy: { timestamp: 'asc' }
        });
        return { success: true, data: comments };
    } catch (error) {
        console.error('Failed to get comments:', error);
        return { success: false, error: 'Failed to fetch comments' };
    }
}

// The second argument is ignored; kept so existing callers still type-check.
export async function deletePostComment(commentId: string, _postId?: string): Promise<ActionState> {
    try {
        const session = await getSession();
        if (!session || !session.userId) {
            return { success: false, error: 'Unauthorized' };
        }

        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
            include: { post: true }
        });

        if (!comment) return { success: false, error: 'Comment not found' };

        if (comment.authorId !== session.userId) {
            return { success: false, error: 'Unauthorized' };
        }

        // The comment's own post, not the postId the caller sent: trusting
        // that let anyone push any post's comment count negative.
        await prisma.$transaction([
            prisma.comment.delete({ where: { id: commentId } }),
            prisma.post.update({
                where: { id: comment.postId },
                data: { comments: { decrement: 1 } }
            }),
        ]);

        revalidatePath(`/clubs/${comment.post.clubId}`);
        updateTag(`club-${comment.post.clubId}`);
        updateTag(CACHE_TAGS.CLUBS);
        return { success: true, message: 'Comment deleted' };
    } catch (error) {
        console.error('Failed to delete comment:', error);
        return { success: false, error: 'Failed to delete comment' };
    }
}
