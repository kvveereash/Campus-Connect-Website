/**
 * @jest-environment node
 *
 * Actions that used to act on an id the browser supplied. Each must act only
 * on the signed-in user, and chat writes only inside the user's conversations.
 */

const mockGetSession = jest.fn();
const mockTrigger = jest.fn();
const mockDb = {
    notification: { updateMany: jest.fn(), findMany: jest.fn() },
    conversationParticipant: { findUnique: jest.fn() },
    message: { create: jest.fn(), findUnique: jest.fn() },
    conversation: { update: jest.fn() },
    reaction: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(mockDb)),
};

// A getter, because the imports below are hoisted above mockDb's initialiser.
jest.mock('@/lib/db', () => ({ __esModule: true, get default() { return mockDb; } }));
jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }));
jest.mock('@/lib/pusher', () => ({ pusherServer: { trigger: (...a: unknown[]) => mockTrigger(...a) } }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/rate-limit', () => ({
    messageLimiter: undefined,
    checkRateLimit: jest.fn(async () => ({ success: true })),
    getRateLimitIdentifier: jest.fn(async () => 'test'),
}));

import { getNotifications, markNotificationAsReadAction } from '../actions/notifications';
import { sendMessageAction, triggerTypingAction, toggleReactionAction } from '../actions/chat';

beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({
        userId: 'me',
        user: { id: 'me', name: 'Me', email: 'me@x.edu', role: 'USER', avatar: null },
    });
});

describe('notifications', () => {
    it('getNotifications reads the session user, not an argument', async () => {
        mockDb.notification.findMany.mockResolvedValue([]);
        // A stale client may still pass an id; it must be ignored.
        await (getNotifications as (id?: string) => Promise<unknown>)('someone-else');
        expect(mockDb.notification.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { recipientId: 'me' } })
        );
    });

    it('getNotifications returns nothing without a session', async () => {
        mockGetSession.mockResolvedValue(null);
        expect(await getNotifications()).toEqual([]);
        expect(mockDb.notification.findMany).not.toHaveBeenCalled();
    });

    it('markNotificationAsRead only touches the caller\'s own notification', async () => {
        mockDb.notification.updateMany.mockResolvedValue({ count: 0 });
        await markNotificationAsReadAction({ notificationId: 'n1' });
        expect(mockDb.notification.updateMany).toHaveBeenCalledWith({
            where: { id: 'n1', recipientId: 'me' },
            data: { read: true },
        });
    });
});

describe('chat membership', () => {
    it('refuses to send into a conversation the caller is not in', async () => {
        mockDb.conversationParticipant.findUnique.mockResolvedValue(null);
        const result = await sendMessageAction({ conversationId: 'c1', content: 'hi' });
        expect(result.success).toBe(false);
        expect(mockDb.message.create).not.toHaveBeenCalled();
    });

    it('sends when the caller is a participant', async () => {
        mockDb.conversationParticipant.findUnique.mockResolvedValue({ id: 'p1' });
        const result = await sendMessageAction({ conversationId: 'c1', content: 'hi' });
        expect(result.success).toBe(true);
        expect(mockDb.message.create).toHaveBeenCalled();
    });

    it('refuses typing events for a conversation the caller is not in', async () => {
        mockDb.conversationParticipant.findUnique.mockResolvedValue(null);
        const result = await triggerTypingAction({ conversationId: 'c1' });
        expect(result.success).toBe(false);
        expect(mockTrigger).not.toHaveBeenCalled();
    });

    it('refuses reactions on a message in a conversation the caller is not in', async () => {
        mockDb.message.findUnique.mockResolvedValue({ conversationId: 'c1' });
        mockDb.conversationParticipant.findUnique.mockResolvedValue(null);
        const result = await toggleReactionAction({ messageId: 'm1', emoji: '👍' });
        expect(result.success).toBe(false);
        expect(mockDb.reaction.create).not.toHaveBeenCalled();
        expect(mockDb.conversationParticipant.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { userId_conversationId: { userId: 'me', conversationId: 'c1' } } })
        );
    });
});
