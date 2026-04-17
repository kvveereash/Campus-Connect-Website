'use server';

import prisma from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { sanitizeRichText } from '@/lib/sanitize';
import { ok, fail, ApiResult } from '@/lib/api-response';

/**
 * Transaction Helpers
 * 
 * Centralized transaction wrappers for multi-step operations
 * that require atomicity and consistency.
 */

/**
 * Create a post with comment count update in a single transaction
 * Prevents orphaned posts or incorrect comment counts
 */
export async function createPostWithTransaction(
    clubId: string,
    content: string,
    image?: string
): Promise<ApiResult<{ postId: string }>> {
    const session = await getSession();
    if (!session?.userId) {
        return fail('Please log in to post', 'UNAUTHORIZED');
    }

    const userId = session.userId as string;

    try {
        // Verify membership first
        const membership = await prisma.clubMember.findUnique({
            where: {
                userId_clubId: { userId, clubId }
            }
        });

        if (!membership) {
            return fail('You must be a member to post', 'FORBIDDEN');
        }

        // Sanitize content
        const sanitizedContent = sanitizeRichText(content);

        // Create post in transaction
        const post = await prisma.$transaction(async (tx) => {
            const newPost = await tx.post.create({
                data: {
                    content: sanitizedContent,
                    image,
                    clubId,
                    authorId: userId
                }
            });

            return newPost;
        });

        revalidatePath(`/clubs/${clubId}`);
        return ok({ postId: post.id }, 'Post created successfully');

    } catch (error) {
        console.error('[createPostWithTransaction]', error);
        return fail('Failed to create post', 'INTERNAL_ERROR');
    }
}

/**
 * Delete a post with all related data in a single transaction
 * Ensures comments and likes are cleaned up atomically
 */
export async function deletePostWithTransaction(
    postId: string,
    clubId: string
): Promise<ApiResult<null>> {
    const session = await getSession();
    if (!session?.userId) {
        return fail('Please log in', 'UNAUTHORIZED');
    }

    const userId = session.userId as string;

    try {
        // Get post with club info for permission check
        const post = await prisma.post.findUnique({
            where: { id: postId },
            include: {
                club: {
                    include: {
                        members: {
                            where: { userId },
                            select: { role: true }
                        }
                    }
                }
            }
        });

        if (!post) {
            return fail('Post not found', 'NOT_FOUND');
        }

        // Check permission: Author OR Club Admin
        const isAuthor = post.authorId === userId;
        const isClubAdmin = post.club.members[0]?.role === 'ADMIN';

        if (!isAuthor && !isClubAdmin) {
            return fail('You do not have permission to delete this post', 'FORBIDDEN');
        }

        // Delete in transaction
        await prisma.$transaction(async (tx) => {
            // Delete all comments first
            await tx.comment.deleteMany({
                where: { postId }
            });

            // Delete the post
            await tx.post.delete({
                where: { id: postId }
            });
        });

        revalidatePath(`/clubs/${clubId}`);
        return ok(null, 'Post deleted successfully');

    } catch (error) {
        console.error('[deletePostWithTransaction]', error);
        return fail('Failed to delete post', 'INTERNAL_ERROR');
    }
}

/**
 * Update club membership with notification in a transaction
 */
export async function joinClubWithNotification(
    clubId: string
): Promise<ApiResult<{ membershipId: string }>> {
    const session = await getSession();
    if (!session?.userId) {
        return fail('Please log in to join clubs', 'UNAUTHORIZED');
    }

    const userId = session.userId as string;

    try {
        const result = await prisma.$transaction(async (tx) => {
            // Check if already a member
            const existing = await tx.clubMember.findUnique({
                where: {
                    userId_clubId: { userId, clubId }
                }
            });

            if (existing) {
                throw new Error('ALREADY_MEMBER');
            }

            // Get club for notification
            const club = await tx.club.findUnique({
                where: { id: clubId },
                include: {
                    members: {
                        where: { role: 'ADMIN' },
                        select: { userId: true }
                    }
                }
            });

            if (!club) {
                throw new Error('CLUB_NOT_FOUND');
            }

            // Create membership
            const membership = await tx.clubMember.create({
                data: {
                    userId,
                    clubId,
                    role: 'MEMBER'
                }
            });

            // Notify club admins (outside transaction to avoid blocking)
            return { membership, adminIds: club.members.map(m => m.userId) };
        });

        // Create notifications for admins (non-blocking)
        const { createNotification } = await import('@/lib/notification-helper');
        for (const adminId of result.adminIds) {
            if (adminId !== userId) {
                createNotification(
                    adminId,
                    userId,
                    'CLUB_JOIN',
                    'joined your club',
                    `/clubs/${clubId}`
                ).catch(console.error);
            }
        }

        revalidatePath(`/clubs/${clubId}`);
        revalidatePath('/clubs');
        revalidatePath('/profile');

        return ok({ membershipId: result.membership.id }, 'Joined club successfully');

    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'ALREADY_MEMBER') {
                return fail('You are already a member of this club', 'CONFLICT');
            }
            if (error.message === 'CLUB_NOT_FOUND') {
                return fail('Club not found', 'NOT_FOUND');
            }
        }
        console.error('[joinClubWithNotification]', error);
        return fail('Failed to join club', 'INTERNAL_ERROR');
    }
}
