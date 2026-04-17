'use server';

import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { ActionState } from '@/types';
import { pusherServer } from '@/lib/pusher';

// Start or Get existing conversation with a user
import { createProtectedAction } from '@/lib/protected-action';
import { z } from 'zod';
import { isOk } from '@/lib/api-response';
import { messageLimiter } from '@/lib/rate-limit'; // Need to export this from rate-limit if not already
import { sanitizePlainText } from '@/lib/sanitize';

// ─────────────────────────────────────────────────
// Protected Actions
// ─────────────────────────────────────────────────

// 1. Start Conversation
const startConversationSchema = z.object({
    targetUserId: z.string()
});

export const startConversationAction = createProtectedAction(startConversationSchema, async (data, session) => {
    if (data.targetUserId === session.userId) {
        throw new Error('Cannot chat with self');
    }

    // Verify users exist
    const [currentUser, targetUser] = await Promise.all([
        prisma.user.findUnique({ where: { id: session.userId } }),
        prisma.user.findUnique({ where: { id: data.targetUserId } })
    ]);

    if (!currentUser) throw new Error('Current user not found');
    if (!targetUser) throw new Error('Target user not found');

    // Check if conversation exists
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

    const existing = conversations.find(c => c.participants.some(p => p.userId === data.targetUserId));

    if (existing) {
        return existing.id;
    }

    // Create new
    const newConv = await prisma.conversation.create({
        data: {
            participants: {
                create: [
                    { userId: session.userId },
                    { userId: data.targetUserId }
                ]
            }
        }
    });

    revalidatePath('/messages');
    return newConv.id;
});

// 2. Send Message
const sendMessageSchema = z.object({
    conversationId: z.string(),
    content: z.string(),
    attachmentUrl: z.string().optional(),
    attachmentType: z.string().optional()
});

export const sendMessageAction = createProtectedAction(sendMessageSchema, async (data, session) => {
    if (!data.content.trim() && !data.attachmentUrl) {
        throw new Error('Empty message');
    }

    // Sanitize message content
    const sanitizedContent = data.content ? sanitizePlainText(data.content) : (data.attachmentType === 'image' ? 'Sent an image' : 'Sent a file');

    try {
        await prisma.$transaction(async (tx) => {
            await tx.message.create({
                data: {
                    content: sanitizedContent,
                    conversationId: data.conversationId,
                    senderId: session.userId,
                    attachmentUrl: data.attachmentUrl,
                    attachmentType: data.attachmentType
                }
            });

            await tx.conversation.update({
                where: { id: data.conversationId },
                data: { updatedAt: new Date() }
            });
        });

        // Trigger pusher event (optional, usually done here or in separate event handler)
        // Original code didn't trigger 'new-message' via Pusher? 
        // Wait, `sendMessage` in original code (lines 162-208) did NOT trigger Pusher.
        // But `markAsRead` and others do. 
        // Maybe the client subscribes to DB changes or uses polling? Or I missed it.
        // Ah, `sendMessage` logic in original code (lines 162-208) does NOT show Pusher trigger.
        // That's standard for some apps (optimistic UI), but usually backend triggers it.
        // I will preserve original behavior (no pusher trigger in sendMessage).

        revalidatePath(`/messages`);
        return { message: 'Sent' };
    } catch (error) {
        // Transaction failed
        throw new Error('Failed to send message');
    }
}, {
    rateLimiter: messageLimiter // Use shared limiter
    // Note: duplicate imports of rate-limit might need checking if I import `messageLimiter` at top.
});

// 3. Mark as Read
const markAsReadSchema = z.object({
    conversationId: z.string()
});

export const markAsReadAction = createProtectedAction(markAsReadSchema, async (data, session) => {
    await prisma.conversationParticipant.update({
        where: { userId_conversationId: { userId: session.userId, conversationId: data.conversationId } },
        data: { lastReadAt: new Date() }
    });

    // Trigger read-update
    await pusherServer.trigger(`chat-${data.conversationId}`, 'read-update', {
        userId: session.userId,
        lastReadAt: new Date()
    });

    return { success: true };
});

// ─────────────────────────────────────────────────
// Legacy Wrappers
// ─────────────────────────────────────────────────

/** @deprecated Use startConversationAction */
export async function startConversation(targetUserId: string): Promise<ActionState<string>> {
    const result = await startConversationAction({ targetUserId });
    if (isOk(result)) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}

/** @deprecated Use sendMessageAction */
export async function sendMessage(conversationId: string, content: string, attachmentUrl?: string, attachmentType?: string): Promise<ActionState> {
    const result = await sendMessageAction({ conversationId, content, attachmentUrl, attachmentType });
    if (isOk(result)) {
        return { success: true, message: 'Sent' };
    }
    return { success: false, error: result.error };
}

/** @deprecated Use markAsReadAction */
export async function markAsRead(conversationId: string) {
    const result = await markAsReadAction({ conversationId });
    if (isOk(result)) {
        return { success: true };
    }
    return { success: false };
}

// ─────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────

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
                name,
                otherUser: isGroup ? null : other,
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

// 4. Create Group Conversation
const createGroupConversationSchema = z.object({
    name: z.string(),
    participantIds: z.array(z.string())
});

export const createGroupConversationAction = createProtectedAction(createGroupConversationSchema, async (data, session) => {
    if (!data.name.trim()) throw new Error('Group name required');
    if (data.participantIds.length === 0) throw new Error('Select at least one member');

    // Add creator to participants
    const allParticipants = [...new Set([...data.participantIds, session.userId])];

    const group = await prisma.conversation.create({
        data: {
            isGroup: true,
            name: data.name,
            participants: {
                create: allParticipants.map(id => ({
                    userId: id,
                    role: id === session.userId ? 'ADMIN' : 'MEMBER'
                }))
            }
        }
    });

    revalidatePath('/messages');
    return group.id;
});

// 5. Leave Group
const leaveGroupSchema = z.object({
    conversationId: z.string()
});

export const leaveGroupAction = createProtectedAction(leaveGroupSchema, async (data, session) => {
    await prisma.conversationParticipant.deleteMany({
        where: {
            conversationId: data.conversationId,
            userId: session.userId
        }
    });

    revalidatePath('/messages');
    return { message: 'Left group' };
});

// 6. Add Member to Group
const addMemberToGroupSchema = z.object({
    conversationId: z.string(),
    userId: z.string()
});

export const addMemberToGroupAction = createProtectedAction(addMemberToGroupSchema, async (data, session) => {
    // Verify requester is admin
    const requester = await prisma.conversationParticipant.findUnique({
        where: {
            userId_conversationId: {
                userId: session.userId,
                conversationId: data.conversationId
            }
        }
    });

    if (!requester) throw new Error('Not a member');
    if (requester.role !== 'ADMIN') throw new Error('Only admins can add members');

    // Check if user already exists
    const exists = await prisma.conversationParticipant.findUnique({
        where: {
            userId_conversationId: {
                userId: data.userId,
                conversationId: data.conversationId
            }
        }
    });

    if (exists) throw new Error('User already in group');

    await prisma.conversationParticipant.create({
        data: {
            conversationId: data.conversationId,
            userId: data.userId,
            role: 'MEMBER'
        }
    });

    revalidatePath('/messages');
    return { message: 'Added' };
});

// 7. Update Presence
const updatePresenceSchema = z.object({});

export const updatePresenceAction = createProtectedAction(updatePresenceSchema, async (_, session) => {
    await prisma.user.update({
        where: { id: session.userId },
        data: { lastSeenAt: new Date() }
    });
    return { success: true };
}, {
    // Low priority, maybe no audit
});

// 8. Trigger Typing
const triggerTypingSchema = z.object({
    conversationId: z.string()
});

export const triggerTypingAction = createProtectedAction(triggerTypingSchema, async (data, session) => {
    await pusherServer.trigger(`chat-${data.conversationId}`, 'typing', {
        userId: session.userId
    });
    return { success: true };
});

// 9. Toggle Reaction
const toggleReactionSchema = z.object({
    messageId: z.string(),
    emoji: z.string()
});

export const toggleReactionAction = createProtectedAction(toggleReactionSchema, async (data, session) => {
    const existing = await prisma.reaction.findUnique({
        where: { messageId_userId_emoji: { messageId: data.messageId, userId: session.userId, emoji: data.emoji } }
    });

    if (existing) {
        await prisma.reaction.delete({ where: { id: existing.id } });
    } else {
        await prisma.reaction.create({
            data: { messageId: data.messageId, userId: session.userId, emoji: data.emoji }
        });
    }

    // Fetch updated reactions
    const reactions = await prisma.reaction.findMany({
        where: { messageId: data.messageId },
        include: { user: { select: { id: true, name: true } } }
    });

    // Get conversationId to broadcast
    const message = await prisma.message.findUnique({ where: { id: data.messageId }, select: { conversationId: true } });
    if (message) {
        await pusherServer.trigger(`chat-${message.conversationId}`, 'reaction-update', {
            messageId: data.messageId,
            reactions
        });
    }

    return { success: true };
});

// ─────────────────────────────────────────────────
// Legacy Wrappers
// ─────────────────────────────────────────────────

/** @deprecated Use createGroupConversationAction */
export async function createGroupConversation(name: string, participantIds: string[]): Promise<ActionState<string>> {
    const result = await createGroupConversationAction({ name, participantIds });
    if (isOk(result)) return { success: true, data: result.data };
    return { success: false, error: result.error };
}

/** @deprecated Use leaveGroupAction */
export async function leaveGroup(conversationId: string): Promise<ActionState> {
    const result = await leaveGroupAction({ conversationId });
    if (isOk(result)) return { success: true, message: 'Left group' };
    return { success: false, error: result.error };
}

/** @deprecated Use addMemberToGroupAction */
export async function addMemberToGroup(conversationId: string, userId: string): Promise<ActionState> {
    const result = await addMemberToGroupAction({ conversationId, userId });
    if (isOk(result)) return { success: true, message: 'Added' };
    return { success: false, error: result.error };
}

/** @deprecated Use updatePresenceAction */
export async function updatePresence() {
    const result = await updatePresenceAction({});
    if (isOk(result)) return { success: true };
    return { success: false };
}

/** @deprecated Use triggerTypingAction */
export async function triggerTyping(conversationId: string) {
    const result = await triggerTypingAction({ conversationId });
    if (isOk(result)) return { success: true };
    return { success: false };
}

/** @deprecated Use toggleReactionAction */
export async function toggleReaction(messageId: string, emoji: string) {
    const result = await toggleReactionAction({ messageId, emoji });
    if (isOk(result)) return { success: true };
    return { success: false };
}

// 10. Get Conversation Details
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
                            select: { id: true, name: true, avatar: true, lastSeenAt: true }
                        }
                    }
                }
            }
        });

        if (!conversation) return null;

        // Security check
        const isParticipant = conversation.participants.some(p => p.userId === session.userId);
        if (!isParticipant) return null;

        return conversation;
    } catch (error) {
        console.error('Failed to get conversation details:', error);
        return null;
    }
}

// 11. Search Users
export async function searchUsers(query: string) {
    try {
        const session = await getSession();
        if (!session?.userId) return [];

        if (!query || query.length < 2) return [];

        const users = await prisma.user.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { name: { contains: query, mode: 'insensitive' } },
                            { email: { contains: query, mode: 'insensitive' } }
                        ]
                    },
                    { id: { not: session.userId } }
                ]
            },
            select: { id: true, name: true, avatar: true },
            take: 10
        });

        return users;
    } catch (error) {
        console.error('Search failed:', error);
        return [];
    }
}
