import prisma from '@/lib/db';
import { pusherServer } from '@/lib/pusher';
import { Prisma } from '@prisma/client';

export async function createNotification(
    recipientId: string,
    actorId: string,
    type: Prisma.NotificationCreateInput['type'],
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
