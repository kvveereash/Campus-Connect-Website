'use server';

import prisma from '@/lib/db';
import { pusherServer } from '@/lib/pusher';
import { getSession } from '@/lib/auth';

export async function createNotification(
    recipientId: string,
    actorId: string,
    type: string,
    message: string,
    link: string
) {
    try {
        // 1. Create in DB
        const notification = await prisma.notification.create({
            data: {
                recipientId,
                actorId,
                type,
                message,
                link,
                read: false,
            },
            include: {
                actor: {
                    select: {
                        name: true,
                        avatar: true
                    }
                }
            }
        });

        // 2. Trigger Pusher
        // Channel: user-{recipientId}
        // Event: notification:new
        await pusherServer.trigger(`user-${recipientId}`, 'notification:new', notification);

        return { success: true, notification };

    } catch (error) {
        console.error('Failed to create notification:', error);
        // Don't fail the whole action if notification fails, just log it
        return { success: false, error: 'Failed to create notification' };
    }
}

export async function markNotificationAsRead(notificationId: string) {
    try {
        const session = await getSession();
        if (!session || !session.userId) return { success: false };

        await prisma.notification.update({
            where: { id: notificationId },
            data: { read: true }
        });

        return { success: true };
    } catch (error) {
        console.error('Failed to mark notification read:', error);
        return { success: false };
    }
}

export async function markAllNotificationsAsRead(userId: string) {
    try {
        const session = await getSession();
        if (!session || !session.userId) return { success: false };

        // Security check: ensure performing action for self
        if (session.userId !== userId) {
            return { success: false, error: 'Unauthorized' };
        }

        await prisma.notification.updateMany({
            where: {
                recipientId: userId,
                read: false
            },
            data: { read: true }
        });

        return { success: true };
    } catch (error) {
        console.error('Failed to mark all notifications read:', error);
        return { success: false };
    }
}

export async function getNotifications(userId: string) {
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
