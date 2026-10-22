'use server';

import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';



import { createProtectedAction } from '@/lib/protected-action';
import { z } from 'zod';
import { isOk } from '@/lib/api-response';

// ... (imports)

// ─────────────────────────────────────────────────
// Protected Actions
// ─────────────────────────────────────────────────

export const markNotificationAsReadAction = createProtectedAction(z.object({ notificationId: z.string() }), async (data, session) => {
    // updateMany so recipientId can sit in the filter: a notification id on
    // its own let anyone mark anyone's notifications as read.
    await prisma.notification.updateMany({
        where: { id: data.notificationId, recipientId: session.userId },
        data: { read: true }
    });
    return { success: true };
}, {
    allowDemo: true,
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
}, { allowDemo: true });

// ─────────────────────────────────────────────────
// Legacy Wrappers
// ─────────────────────────────────────────────────

export async function markNotificationAsRead(notificationId: string) {
    const result = await markNotificationAsReadAction({ notificationId });
    if (isOk(result)) return { success: true };
    return { success: false, error: result.error };
}

export async function markAllNotificationsAsRead() {
    const result = await markAllNotificationsAsReadAction({});
    if (isOk(result)) return { success: true };
    return { success: false, error: result.error };
}

/**
 * The signed-in user's notifications. Takes no id: it used to accept one and
 * return that user's notifications to whoever asked.
 */
export async function getNotifications() {
    const session = await getSession();
    const userId = session?.userId as string | undefined;
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
