'use server';

import prisma from '@/lib/db';
import { pusherServer } from '@/lib/pusher';
import { getSession } from '@/lib/auth';



import { createProtectedAction } from '@/lib/protected-action';
import { z } from 'zod';
import { isOk } from '@/lib/api-response';

// ... (imports)

// ─────────────────────────────────────────────────
// Protected Actions
// ─────────────────────────────────────────────────

export const markNotificationAsReadAction = createProtectedAction(z.object({ notificationId: z.string() }), async (data, session) => {
    await prisma.notification.update({
        where: { id: data.notificationId },
        data: { read: true }
    });
    return { success: true };
}, {
    // No specific role required, just auth
});

export const markAllNotificationsAsReadAction = createProtectedAction(z.object({}), async (_, session) => {
    await prisma.notification.updateMany({
        where: {
            recipientId: session.userId,
            read: false
        },
        data: { read: true }
    });
    return { success: true };
});

// ─────────────────────────────────────────────────
// Legacy Wrappers
// ─────────────────────────────────────────────────

export async function markNotificationAsRead(notificationId: string) {
    const result = await markNotificationAsReadAction({ notificationId });
    if (isOk(result)) return { success: true };
    return { success: false, error: result.error };
}

export async function markAllNotificationsAsRead(userId?: string) {
    // Legacy allowed passing userId but checked strictly against session. 
    // New action uses session directly.
    const result = await markAllNotificationsAsReadAction({});
    if (isOk(result)) return { success: true };
    return { success: false, error: result.error };
}

export async function getNotifications(userId?: string) {
    if (!userId) {
        const session = await getSession();
        userId = session?.userId as string;
    }
    if (!userId) return [];

    try {
        const notifications = await prisma.notification.findMany({
            where: { recipientId: userId },
            orderBy: { createdAt: 'desc' },
            take: 20, // Limit to recent 20
            include: {
                actor: {
                    select: {
                        name: true,
                        avatar: true
                    }
                }
            }
        });
        return notifications;
    } catch (error) {
        console.error('Failed to get notifications:', error);
        return [];
    }
}
