'use server';

import prisma from '@/lib/db';
import { revalidatePath, unstable_cache } from 'next/cache';
import { getSession } from '@/lib/auth';
import { ActionState } from '@/types';
import { sanitizeRichText } from '@/lib/sanitize';
import { postLimiter, commentLimiter, getRateLimitIdentifier, checkRateLimit } from '@/lib/rate-limit';
import { AuthenticationError, NotFoundError, ConflictError, AuthorizationError, ErrorHandler } from '@/lib/errors';
import { CACHE_TAGS, CACHE_TTL } from '@/lib/cache';

import { createSafeAction } from '@/lib/safe-action';
import { clubSchema } from '@/lib/schemas';

export const createClubSafe = createSafeAction(clubSchema, async (data) => {
    const session = await getSession();
    if (!session || !session.userId) throw new Error('Unauthorized');

    const user = await prisma.user.findUnique({ where: { id: session.userId as string } });
    if (!user) throw new Error('User not found');

    // Determine College ID: explicit selection > user's college > error
    const targetCollegeId = data.collegeId || user?.collegeId;
    if (!targetCollegeId) throw new Error('College selection is required');

    const club = await prisma.club.create({
        data: {
            name: data.name,
            description: data.description,
            category: data.category,
            logo: data.logo || '/club-logo-placeholder.png', // Handle optional/placeholder
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
    return club;
});

export async function createClub(data: {
    name: string;
    description: string;
    category: string;
    logo: string;
    collegeId?: string;
}): Promise<ActionState<any>> {
    const session = await getSession();
    if (!session || !session.userId) return { success: false, error: 'Unauthorized' };

    // Adapter for Safe Action
    // Note: Schema expects specific types.
    const validation = clubSchema.safeParse(data);
    if (!validation.success) return { success: false, error: validation.error.issues[0].message };

    const result = await createClubSafe(data);
    if (result.error) return { success: false, error: result.error };
    return { success: true, message: 'Club created successfully', data: result.data };
}


// Internal uncached query for clubs list
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
            createdAt: true,
            updatedAt: true,
            college: {
                select: {
                    id: true,
                    name: true
                }
            },
            // Optimized: Only count members instead of fetching all
            _count: {
                select: { members: true }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 50 // Limit for performance
    });

    return clubs.map(club => ({
        ...club,
        createdAt: club.createdAt.toISOString(),
        updatedAt: club.updatedAt.toISOString()
    }));
}

// Cached version - 120 second TTL
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

export async function getClubDetails(clubId: string) {
    try {
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
                    select: {
                        id: true,
                        name: true,
                        location: true
                    }
                },
                events: {
                    select: {
                        id: true,
                        title: true,
                        date: true,
                        category: true,
                        thumbnail: true
                    },
                    orderBy: { date: 'desc' },
                    take: 10 // Limit to recent 10 events
                },
                members: {
                    select: {
                        id: true,
                        role: true,
                        joinedAt: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                avatar: true,
                                department: true,
                                year: true,
                                college: {
                                    select: { name: true }
                                }
                            }
                        }
                    },
                    orderBy: { joinedAt: 'asc' }
                },
                _count: {
                    select: {
                        members: true,
                        events: true
                    }
                }
            }
        });
        return club;
    } catch (error) {
        console.error('Error fetching club details:', error);
        throw error;
    }
}

export async function deleteClub(clubId: string): Promise<ActionState> {
    try {
        const session = await getSession();
        if (!session || !session.userId) {
            return { success: false, error: 'Unauthorized' };
        }

        // 1. Check if user is admin of the club
        const membership = await prisma.clubMember.findUnique({
            where: {
                userId_clubId: {
                    userId: session.userId as string,
                    clubId: clubId
                }
            }
        });

        if (!membership || membership.role !== 'ADMIN') {
            return { success: false, error: 'You do not have permission to delete this club.' };
        }

        // 2. Perform deletion
        await prisma.$transaction(async (tx) => {
            // Delete all members
            await tx.clubMember.deleteMany({
                where: { clubId: clubId }
            });

            // Disassociate events (set clubId to null)
            await tx.event.updateMany({
                where: { clubId: clubId },
                data: { clubId: null }
            });

            // Delete the club
            await tx.club.delete({
                where: { id: clubId }
            });
        });

        revalidatePath('/clubs');
        revalidatePath('/profile');
        return { success: true, message: 'Club deleted successfully' };

    } catch (error) {
        console.error('Failed to delete club:', error);
        return { success: false, error: 'Failed to delete club' };
    }
}

export async function joinClub(clubId: string): Promise<ActionState> {
    try {
        const session = await getSession();
        if (!session || !session.userId) {
            throw new AuthenticationError('Please log in to join clubs');
        }

        const existingMember = await prisma.clubMember.findUnique({
            where: {
                userId_clubId: {
                    userId: session.userId as string,
                    clubId: clubId
                }
            }
        });

        if (existingMember) {
            throw new ConflictError('You are already a member of this club');
        }

        await prisma.clubMember.create({
            data: {
                userId: session.userId as string,
                clubId: clubId,
                role: 'MEMBER'
            }
        });

        revalidatePath(`/clubs/${clubId}`);
        revalidatePath('/clubs');
        revalidatePath('/profile');

        return { success: true, message: 'Joined club successfully' };
    } catch (error) {
        return ErrorHandler.handle(error, { action: 'joinClub', clubId });
    }
}

export async function leaveClub(clubId: string): Promise<ActionState> {
    try {
        const session = await getSession();
        if (!session || !session.userId) {
            return { success: false, error: 'Unauthorized' };
        }

        const membership = await prisma.clubMember.findUnique({
            where: {
                userId_clubId: {
                    userId: session.userId as string,
                    clubId: clubId
                }
            }
        });

        if (!membership) {
            return { success: false, error: 'Not a member of this club' };
        }

        if (membership.role === 'ADMIN') {
            return { success: false, error: 'Admins cannot leave the club. You must delete the club or transfer ownership.' };
        }

        await prisma.clubMember.delete({
            where: {
                userId_clubId: {
                    userId: session.userId as string,
                    clubId: clubId
                }
            }
        });

        revalidatePath(`/clubs/${clubId}`);
        revalidatePath('/clubs');
        revalidatePath('/profile');

        return { success: true, message: 'Left club successfully' };
    } catch (error) {
        console.error('Failed to leave club:', error);
        return { success: false, error: 'Failed to leave club' };
    }
}

export async function createClubPost(clubId: string, content: string, image?: string): Promise<ActionState<any>> {
    try {
        const session = await getSession();
        if (!session || !session.userId) {
            return { success: false, error: 'Unauthorized' };
        }

        // Rate limiting: 5 posts per hour per user
        const identifier = getRateLimitIdentifier(session.userId as string);
        const rateLimit = await checkRateLimit(postLimiter, identifier);

        if (!rateLimit.success) {
            return {
                success: false,
                error: `Slow down! You can create ${rateLimit.remaining} more posts. Try again in a few minutes.`
            };
        }

        // Check if member
        const membership = await prisma.clubMember.findUnique({
            where: {
                userId_clubId: {
                    userId: session.userId as string,
                    clubId: clubId
                }
            }
        });

        if (!membership) {
            return { success: false, error: 'You must be a member to post.' };
        }

        // Sanitize content to prevent XSS
        const sanitizedContent = sanitizeRichText(content);

        const post = await prisma.post.create({
            data: {
                content: sanitizedContent,
                image,
                clubId,
                authorId: session.userId as string
            }
        });

        revalidatePath(`/clubs/${clubId}`);
        return { success: true, message: 'Post created', data: post };
    } catch (error) {
        console.error('Failed to create post:', error);
        return { success: false, error: 'Failed to create post' };
    }
}

export async function getClubPosts(clubId: string) {
    try {
        const posts = await prisma.post.findMany({
            where: { clubId },
            orderBy: { timestamp: 'desc' },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true
                    }
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

        // Check permission: Author OR Club Admin
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
            return { success: false, error: 'only the author can edit this post' };
        }

        // Sanitize content to prevent XSS
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

        // Rate limiting: 10 comments per minute per user
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

        // Sanitize content to prevent XSS
        const sanitizedContent = sanitizeRichText(content);

        // Create comment
        await prisma.comment.create({
            data: {
                content: sanitizedContent,
                postId,
                authorId: session.userId
            }
        });

        // Update post comment count (optimistic feeling, but real data)
        await prisma.post.update({
            where: { id: postId },
            data: { comments: { increment: 1 } }
        });

        // Notify post author
        if (post.authorId !== session.userId) {
            const { createNotification } = await import('@/lib/actions/notifications');
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
            // Optionally check for Club Admin/Post Author too, but start with Comment Author
            return { success: false, error: 'Unauthorized' };
        }

        await prisma.comment.delete({ where: { id: commentId } });

        // Decrement count
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
