'use server';

import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { ActionState } from '@/types';
import { broadcast } from '@/lib/pusher-server';
import { chatChannel } from '@/lib/pusher-channels';
import { publicObjectUrlPrefix } from '@/lib/storage';

// Start or Get existing conversation with a user
import { createProtectedAction } from '@/lib/protected-action';
import { z } from 'zod';
import { isOk } from '@/lib/api-response';
import { messageLimiter, postLimiter } from '@/lib/rate-limit'; // Need to export this from rate-limit if not already
import { cleanUserText } from '@/lib/sanitize';

/**
 * Throws unless the user is in the conversation. Every write that names a
 * conversation (or a message in one) goes through this; without it any
 * signed-in user could post into, type into or react in any chat by id.
 */
async function assertParticipant(userId: string, conversationId: string) {
    const participant = await prisma.conversationParticipant.findUnique({
        where: { userId_conversationId: { userId, conversationId } },
        select: { id: true },
    });
    if (!participant) throw new Error('Not a member');
}

// ─────────────────────────────────────────────────
// Protected Actions
// ─────────────────────────────────────────────────

// 1. Start Conversation
const ID = z.string().min(1).max(50);

const startConversationSchema = z.object({
    targetUserId: ID
});

export const startConversationAction = createProtectedAction(startConversationSchema, async (data, session) => {
    if (data.targetUserId === session.userId) {
        throw new Error('Cannot chat with self');
    }

    // Verify users exist
    const [currentUser, targetUser] = await Promise.all([
        prisma.user.findUnique({ where: { id: session.userId } }),
        // Not a deleted account.
        prisma.user.findFirst({ where: { id: data.targetUserId, deletedAt: null } })
    ]);

    if (!currentUser) throw new Error('Current user not found');
    if (!targetUser) throw new Error('Target user not found');

    // Check if conversation exists
    const conversations = await prisma.conversation.findMany({
        where: {
            // Direct messages only: without this, two people who shared any
            // group chat got the group back, and a "private" message went to
            // everyone in it.
            isGroup: false,
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
function isOwnUpload(url: string): boolean {
    const name = /^[\w.-]+$/;
    if (url.startsWith('/uploads/')) return name.test(url.slice('/uploads/'.length));
    const prefix = publicObjectUrlPrefix();
    return !!prefix && url.startsWith(prefix) && name.test(url.slice(prefix.length));
}

const sendMessageSchema = z.object({
    conversationId: z.string().max(50),
    content: z.string().max(2000, 'Message cannot exceed 2000 characters'),
    // Only files that went through /api/upload: our storage bucket, or
    // public/uploads in development. Any string used to be accepted and
    // rendered as a "Download File" link, which made chat a phishing channel.
    attachmentUrl: z.string().max(2048)
        .refine(isOwnUpload, 'Invalid attachment')
        .optional(),
    attachmentType: z.enum(['image', 'file']).optional()
});

export const sendMessageAction = createProtectedAction(sendMessageSchema, async (data, session) => {
    if (!data.content.trim() && !data.attachmentUrl) {
        throw new Error('Empty message');
    }

    await assertParticipant(session.userId, data.conversationId);

    // Sanitize message content
    const cleaned = cleanUserText(data.content);
    if (!cleaned && !data.attachmentUrl) {
        throw new Error('Empty message');
    }
    const sanitizedContent = cleaned || (data.attachmentType === 'image' ? 'Sent an image' : 'Sent a file');

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

        // Nudge open chat windows to fetch. Only the sender's id goes out, not
        // the message: the window loads it through getMessages, which checks
        // membership. (ChatWindow listened for this, but nothing sent it.)
        await broadcast(chatChannel(data.conversationId), 'new-message', { senderId: session.userId });

        revalidatePath(`/messages`);
        return { message: 'Sent' };
    } catch {
        // Transaction failed
        throw new Error('Failed to send message');
    }
}, {
    allowDemo: true,
    rateLimiter: messageLimiter // Use shared limiter
    // Note: duplicate imports of rate-limit might need checking if I import `messageLimiter` at top.
});

// 3. Mark as Read
const markAsReadSchema = z.object({
    conversationId: ID
});

export const markAsReadAction = createProtectedAction(markAsReadSchema, async (data, session) => {
    await prisma.conversationParticipant.update({
        where: { userId_conversationId: { userId: session.userId, conversationId: data.conversationId } },
        data: { lastReadAt: new Date() }
    });

    // Trigger read-update
    await broadcast(chatChannel(data.conversationId), 'read-update', {
        userId: session.userId,
        lastReadAt: new Date()
    });

    return { success: true };
}, { allowDemo: true });

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
export async function sendMessage(conversationId: string, content: string, attachmentUrl?: string, attachmentType?: 'image' | 'file'): Promise<ActionState> {
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
            const me = c.participants.find(p => p.userId === session.userId);
            const lastMsg = c.messages[0];
            const lastSender = lastMsg ? c.participants.find(p => p.userId === lastMsg.senderId)?.user : null;

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
                lastMessageFromMe: lastMsg?.senderId === session.userId,
                lastSenderName: lastSender?.name ?? null,
                // Unread when the newest message is someone else's and arrived
                // after this person last opened the conversation.
                unread: !!lastMsg && lastMsg.senderId !== session.userId && !!me && lastMsg.createdAt > me.lastReadAt,
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
                },
                // The same shape the live 'reaction-update' sends. Without it a
                // reaction showed until the next poll, then disappeared.
                reactions: {
                    include: { user: { select: { id: true, name: true } } }
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
// Bounded: with no limits anyone could put thousands of users into a group
// with a megabyte-long name, and keep messaging all of them.
const createGroupConversationSchema = z.object({
    name: z.string().trim().min(1, 'Group name required').max(100, 'Group name is too long'),
    participantIds: z.array(ID).min(1, 'Select at least one member').max(49, 'A group can have at most 50 people')
});

export const createGroupConversationAction = createProtectedAction(createGroupConversationSchema, async (data, session) => {
    if (!data.name.trim()) throw new Error('Group name required');
    if (data.participantIds.length === 0) throw new Error('Select at least one member');

    // Only live accounts can be added.
    const members = await prisma.user.findMany({
        where: { id: { in: data.participantIds }, deletedAt: null },
        select: { id: true },
    });
    if (members.length === 0) throw new Error('Select at least one member');

    // Add creator to participants
    const allParticipants = [...new Set([...members.map((m) => m.id), session.userId])];

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
}, {
    rateLimiter: postLimiter,
});

// 5. Leave Group
const leaveGroupSchema = z.object({
    conversationId: ID
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
    conversationId: ID,
    userId: ID
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
    allowDemo: true,
    // Low priority, maybe no audit
});

// 8. Trigger Typing
const triggerTypingSchema = z.object({
    conversationId: ID
});

export const triggerTypingAction = createProtectedAction(triggerTypingSchema, async (data, session) => {
    await assertParticipant(session.userId, data.conversationId);

    await broadcast(chatChannel(data.conversationId), 'typing', {
        userId: session.userId
    });
    return { success: true };
}, { allowDemo: true });

// 9. Toggle Reaction
const toggleReactionSchema = z.object({
    messageId: ID,
    // An emoji, not a stored-and-broadcast string of any length.
    emoji: z.string().min(1).max(16)
});

export const toggleReactionAction = createProtectedAction(toggleReactionSchema, async (data, session) => {
    const message = await prisma.message.findUnique({ where: { id: data.messageId }, select: { conversationId: true } });
    if (!message) throw new Error('Message not found');
    await assertParticipant(session.userId, message.conversationId);

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

    await broadcast(chatChannel(message.conversationId), 'reaction-update', {
        messageId: data.messageId,
        reactions
    });

    return { success: true };
}, { allowDemo: true });

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

        if (!query || query.length < 2 || query.length > 100) return [];

        const users = await prisma.user.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { name: { contains: query, mode: 'insensitive' } },
                            // Whole address only. A substring match let anyone
                            // confirm or rebuild another user's email a few
                            // characters at a time.
                            { email: { equals: query.trim(), mode: 'insensitive' } }
                        ]
                    },
                    { id: { not: session.userId } },
                    // Deleted accounts were offered as people to message.
                    { deletedAt: null }
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

// Shapes the chat UI works with, inferred from the actions above so they
// cannot drift from what the server actually sends.
export type ChatMessage = Awaited<ReturnType<typeof getMessages>>[number];
export type ConversationDetails = NonNullable<Awaited<ReturnType<typeof getConversationDetails>>>;
export type ConversationSummary = Awaited<ReturnType<typeof getConversations>>[number];
export type UserSearchResult = Awaited<ReturnType<typeof searchUsers>>[number];
