'use server';

import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { ActionState } from '@/types';
import { pusherServer } from '@/lib/pusher';

// Start or Get existing conversation with a user
export async function startConversation(targetUserId: string): Promise<ActionState<string>> {
    try {
        const session = await getSession();
        if (!session || !session.userId) return { success: false, error: 'Unauthorized' };

        if (targetUserId === session.userId) return { success: false, error: 'Cannot chat with self' };

        // Verify users exist
        const currentUser = await prisma.user.findUnique({ where: { id: session.userId as string } });
        const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });

        if (!currentUser) return { success: false, error: 'Current user not found in database. Please relogin.' };
        if (!targetUser) return { success: false, error: 'Target user not found in database.' };

        // Check if conversation exists
        // Find conversations where current user is a participant
        const conversations = await prisma.conversation.findMany({
            where: {
                participants: {
                    some: { userId: session.userId }
                }
            },
            include: {
                participants: true
            }
        });

        // Loop to find one where targetUser matches
        const existing = conversations.find(c => c.participants.some(p => p.userId === targetUserId));

        if (existing) {
            return { success: true, data: existing.id };
        }

        // Create new
        const newConv = await prisma.conversation.create({
            data: {
                participants: {
                    create: [
                        { userId: session.userId as string },
                        { userId: targetUserId }
                    ]
                }
            }
        });

        revalidatePath('/messages');
        return { success: true, data: newConv.id };

    } catch (error) {
        console.error('Failed to start conversation:', error);
        return { success: false, error: `Error: ${error instanceof Error ? error.message : String(error)}` };
    }
}

export async function getConversations() {
    try {
        const session = await getSession();
        if (!session || !session.userId) return [];

        const conversations = await prisma.conversation.findMany({
            where: {
                participants: {
                    some: { userId: session.userId }
                }
            },
            orderBy: { updatedAt: 'desc' },
            include: {
                participants: {
                    include: {
                        user: {
                            select: { id: true, name: true, avatar: true, lastSeenAt: true }
                        }
                    }
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        return conversations.map(c => {
            const isGroup = c.isGroup;
            const other = c.participants.find(p => p.userId !== session.userId)?.user;
            const lastMsg = c.messages[0];

            // For group: use group name or comma-separated names
            let name = 'Unknown';
            let avatar = null;

            if (isGroup) {
                name = c.name || 'Group Chat';
                avatar = c.groupImage;
            } else {
                name = other?.name || 'Unknown User';
                avatar = other?.avatar;
            }

            return {
                id: c.id,
                isGroup,
                name, // Generic name property for UI
                otherUser: isGroup ? null : other, // Keep compatible if needed
                avatar,
                lastMessage: lastMsg?.content || 'No messages yet',
                lastMessageAt: lastMsg?.createdAt || c.updatedAt,
                unread: false,
                isOnline: other?.lastSeenAt ? (new Date().getTime() - new Date(other.lastSeenAt).getTime() < 2 * 60 * 1000) : false,
                lastSeen: other?.lastSeenAt
            };
        });
    } catch (error) {
        console.error('Failed to get conversations:', error);
        return [];
    }
}

export async function getMessages(conversationId: string) {
    try {
        const session = await getSession();
        if (!session || !session.userId) return [];

        // Verify participant
        const participant = await prisma.conversationParticipant.findUnique({
            where: {
                userId_conversationId: {
                    userId: session.userId,
                    conversationId
                }
            }
        });

        if (!participant) return [];

        const messages = await prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' },
            include: {
                sender: {
                    select: { id: true, name: true, avatar: true }
                }
            }
        });

        return messages;
    } catch (error) {
        console.error('Failed to get messages:', error);
        return [];
    }
}

export async function sendMessage(conversationId: string, content: string, attachmentUrl?: string, attachmentType?: string): Promise<ActionState> {
    try {
        const session = await getSession();
        if (!session || !session.userId) return { success: false, error: 'Unauthorized' };

        if (!content.trim() && !attachmentUrl) return { success: false, error: 'Empty message' };

        // Rate limiting: 10 messages per minute per user
        const { messageLimiter, getRateLimitIdentifier, checkRateLimit } = await import('@/lib/rate-limit');
        const identifier = getRateLimitIdentifier(session.userId as string);
        const rateLimit = await checkRateLimit(messageLimiter, identifier);

        if (!rateLimit.success) {
            return {
                success: false,
                error: `Slow down! Please wait a moment before sending another message.`
            };
        }

        // Sanitize message content to prevent XSS
        const { sanitizePlainText } = await import('@/lib/sanitize');
        const sanitizedContent = content ? sanitizePlainText(content) : (attachmentType === 'image' ? 'Sent an image' : 'Sent a file');

        await prisma.$transaction(async (tx) => {
            await tx.message.create({
                data: {
                    content: sanitizedContent,
                    conversationId,
                    senderId: session.userId as string,
                    attachmentUrl,
                    attachmentType
                }
            });

            await tx.conversation.update({
                where: { id: conversationId },
                data: { updatedAt: new Date() }
            });
        });

        revalidatePath(`/messages`);
        return { success: true, message: 'Sent' };
    } catch (error) {
        console.error('Failed to send message:', error);
        return { success: false, error: 'Failed' };
    }
}

export async function createGroupConversation(name: string, participantIds: string[]): Promise<ActionState<string>> {
    try {
        const session = await getSession();
        if (!session || !session.userId) return { success: false, error: 'Unauthorized' };

        if (!name.trim()) return { success: false, error: 'Group name required' };
        if (participantIds.length === 0) return { success: false, error: 'Select at least one member' };

        // Add creator to participants
        const allParticipants = [...new Set([...participantIds, session.userId])];

        const group = await prisma.conversation.create({
            data: {
                isGroup: true,
                name,
                participants: {
                    create: allParticipants.map(id => ({
                        userId: id,
                        role: id === session.userId ? 'ADMIN' : 'MEMBER'
                    }))
                }
            }
        });

        revalidatePath('/messages');
        return { success: true, data: group.id };

    } catch (error) {
        console.error('Failed to create group:', error);
        return { success: false, error: 'Failed to create group' };
    }
}

export async function leaveGroup(conversationId: string): Promise<ActionState> {
    try {
        const session = await getSession();
        if (!session || !session.userId) return { success: false, error: 'Unauthorized' };

        await prisma.conversationParticipant.deleteMany({
            where: {
                conversationId,
                userId: session.userId
            }
        });

        revalidatePath('/messages');
        return { success: true, message: 'Left group' };
    } catch (error) {
        console.error('Failed to leave group:', error);
        return { success: false, error: 'Failed' };
    }
}

export async function searchUsers(query: string) {
    try {
        const session = await getSession();
        if (!session || !session.userId) return [];

        if (!query || query.length < 2) return [];

        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { name: { contains: query } }, // sqlite is case-sensitive by default usually, but prisma might handle it.
                    { email: { contains: query } }
                ],
                NOT: {
                    id: session.userId
                }
            },
            take: 5,
            select: {
                id: true,
                name: true,
                avatar: true,
                email: true
            }
        });

        return users;
    } catch (error) {
        console.error('Failed to search users:', error);
        return [];
    }
}

export async function getConversationDetails(conversationId: string) {
    try {
        const session = await getSession();
        if (!session || !session.userId) return null;

        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                participants: {
                    include: {
                        user: {
                            select: { id: true, name: true, avatar: true, email: true, lastSeenAt: true }
                        }
                    }
                }
            }
        });

        if (!conversation) return null;

        // Verify membership
        const isMember = conversation.participants.some(p => p.userId === session.userId);
        if (!isMember) return null;

        return conversation;
    } catch (error) {
        console.error('Failed to get details:', error);
        return null;
    }
}

export async function addMemberToGroup(conversationId: string, userId: string): Promise<ActionState> {
    try {
        const session = await getSession();
        if (!session || !session.userId) return { success: false, error: 'Unauthorized' };

        // Verify requester is admin
        const requester = await prisma.conversationParticipant.findUnique({
            where: {
                userId_conversationId: {
                    userId: session.userId,
                    conversationId
                }
            }
        });

        if (!requester) return { success: false, error: 'Not a member' };
        if (requester.role !== 'ADMIN') return { success: false, error: 'Only admins can add members' };

        // Check if user already exists
        const exists = await prisma.conversationParticipant.findUnique({
            where: {
                userId_conversationId: {
                    userId,
                    conversationId
                }
            }
        });

        if (exists) return { success: false, error: 'User already in group' };

        await prisma.conversationParticipant.create({
            data: {
                conversationId,
                userId,
                role: 'MEMBER'
            }
        });

        revalidatePath('/messages');
        return { success: true, message: 'Added' };

    } catch (error) {
        console.error('Failed to add member:', error);
        return { success: false, error: 'Failed' };
    }
}

export async function updatePresence() {
    try {
        const session = await getSession();
        if (!session || !session.userId) return;

        await prisma.user.update({
            where: { id: session.userId },
            data: { lastSeenAt: new Date() }
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to update presence:', error);
        return { success: false };
    }
}

export async function triggerTyping(conversationId: string) {
    try {
        const session = await getSession();
        if (!session || !session.userId) return;

        // Trigger 'typing' event on channel 'chat-{conversationId}'
        // Event data contains userId
        await pusherServer.trigger(`chat-${conversationId}`, 'typing', {
            userId: session.userId
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to trigger typing:', error);
        return { success: false };
    }
}

export async function markAsRead(conversationId: string) {
    try {
        const session = await getSession();
        if (!session || !session.userId) return;

        await prisma.conversationParticipant.update({
            where: { userId_conversationId: { userId: session.userId, conversationId } },
            data: { lastReadAt: new Date() }
        });

        // Trigger read-update
        await pusherServer.trigger(`chat-${conversationId}`, 'read-update', {
            userId: session.userId,
            lastReadAt: new Date()
        });

        return { success: true };
    } catch (error) {
        console.error('Failed to mark as read:', error);
        return { success: false };
    }
}

export async function toggleReaction(messageId: string, emoji: string) {
    try {
        const session = await getSession();
        if (!session || !session.userId) return { success: false, error: 'Unauthorized' };

        const existing = await prisma.reaction.findUnique({
            where: { messageId_userId_emoji: { messageId, userId: session.userId, emoji } }
        });

        if (existing) {
            await prisma.reaction.delete({ where: { id: existing.id } });
        } else {
            await prisma.reaction.create({
                data: { messageId, userId: session.userId, emoji }
            });
        }

        // Fetch updated reactions
        const reactions = await prisma.reaction.findMany({
            where: { messageId },
            include: { user: { select: { id: true, name: true } } }
        });

        // Get conversationId to broadcast
        const message = await prisma.message.findUnique({ where: { id: messageId }, select: { conversationId: true } });
        if (message) {
            await pusherServer.trigger(`chat-${message.conversationId}`, 'reaction-update', {
                messageId,
                reactions
            });
        }

        return { success: true };
    } catch (error) {
        console.error('Failed to toggle reaction:', error);
        return { success: false };
    }
}
