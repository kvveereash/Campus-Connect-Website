'use server';

import prisma from '@/lib/db';
import { revalidatePath, unstable_cache } from 'next/cache';
import { getSession } from '@/lib/auth';
import { ActionState } from '@/types';
import { sanitizeRichText } from '@/lib/sanitize';
import { postLimiter, commentLimiter, getRateLimitIdentifier, checkRateLimit } from '@/lib/rate-limit';
import { AuthenticationError, NotFoundError, ConflictError, AuthorizationError, ErrorHandler } from '@/lib/errors';
import { CACHE_TAGS, CACHE_TTL } from '@/lib/cache';
import { isOk } from '@/lib/api-response';

import { createProtectedAction } from '@/lib/protected-action';
import { clubSchema, joinClubSchema, leaveClubSchema, deleteClubSchema, clubPostSchema } from '@/lib/schemas';

// ─────────────────────────────────────────────────
// Protected Actions (using unified pattern)
// ─────────────────────────────────────────────────

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
    return club;
}, {
    audit: { action: 'CREATE', entityType: 'Club', getEntityId: () => 'new' },
});

export const joinClubAction = createProtectedAction(joinClubSchema, async ({ clubId }, session) => {
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

    // Sanitize content to prevent XSS
    const sanitizedContent = sanitizeRichText(content);

    const post = await prisma.post.create({
        data: {
            content: sanitizedContent,
            image,
            clubId,
            authorId: session.userId
        }
    });

    revalidatePath(`/clubs/${clubId}`);

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
                select: { members: true }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
    });

    return clubs.map(club => ({
        ...club,
        createdAt: club.createdAt.toISOString(),
        updatedAt: club.updatedAt.toISOString()
    }));
}

export async function getClubs(filters?: { search?: string; category?: string }) {
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
            college: {
                select: { id: true, name: true, location: true }
            },
            events: {
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
                select: { members: true, events: true }
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
        return await cached();
    } catch (error) {
        console.error('Error fetching club details:', error);
        throw error;
    }
}

export async function getClubPosts(clubId: string) {
    try {
        const posts = await prisma.post.findMany({
            where: { clubId },
            orderBy: { timestamp: 'desc' },
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
        return { success: true, message: 'Post deleted' };
    } catch (error) {
        console.error('Failed to delete post:', error);
        return { success: false, error: 'Failed to delete post' };
    }
}

export async function editClubPost(postId: string, clubId: string, newContent: string): Promise<ActionState> {
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

        const sanitizedContent = sanitizeRichText(newContent);

        await prisma.post.update({
            where: { id: postId },
            data: { content: sanitizedContent }
        });

        revalidatePath(`/clubs/${clubId}`);
        return { success: true, message: 'Post updated' };
    } catch (error) {
        console.error('Failed to edit post:', error);
        return { success: false, error: 'Failed to edit post' };
    }
}

// --- Comments ---

export async function createPostComment(postId: string, content: string): Promise<ActionState> {
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

        if (!post) return { success: false, error: 'Post not found' };

        const sanitizedContent = sanitizeRichText(content);

        await prisma.comment.create({
            data: {
                content: sanitizedContent,
                postId,
                authorId: session.userId
            }
        });

        await prisma.post.update({
            where: { id: postId },
            data: { comments: { increment: 1 } }
        });

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
        return { success: true, message: 'Comment added' };
    } catch (error) {
        console.error('[createPostComment] ERROR:', error);
        return { success: false, error: `Failed to create comment: ${error instanceof Error ? error.message : String(error)}` };
    }
}

export async function getPostComments(postId: string) {
    try {
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

export async function deletePostComment(commentId: string, postId: string): Promise<ActionState> {
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

        await prisma.comment.delete({ where: { id: commentId } });

        await prisma.post.update({
            where: { id: postId },
            data: { comments: { decrement: 1 } }
        });

        revalidatePath(`/clubs/${comment.post.clubId}`);
        return { success: true, message: 'Comment deleted' };
    } catch (error) {
        console.error('Failed to delete comment:', error);
        return { success: false, error: 'Failed to delete comment' };
    }
}
