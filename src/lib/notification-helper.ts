import prisma from '@/lib/db';
import { broadcast, broadcastMany } from '@/lib/pusher-server';
import { userChannel } from '@/lib/pusher-channels';
import { Prisma } from '@prisma/client';
import { queuePush } from '@/lib/push';

/**
 * One message to many people, such as an organiser's update to everyone
 * going: one insert, realtime in batches, and one push look-up. Making them
 * one at a time cost a database round trip each, a batch at a time, so a big
 * event kept the organiser waiting. Returns how many were sent.
 */
export async function notifyMany(
    recipientIds: string[],
    actorId: string,
    type: Prisma.NotificationCreateInput['type'],
    message: string,
    link: string,
) {
    if (recipientIds.length === 0) return 0;
    // Not caught, unlike createNotification: if the insert fails nobody was
    // told, and the organiser should hear that and try again.
    const [created, actor] = await Promise.all([
        prisma.notification.createManyAndReturn({
            data: recipientIds.map((recipientId) => ({ recipientId, actorId, type, message, link, read: false })),
            select: {
                id: true,
                recipientId: true,
                actorId: true,
                type: true,
                message: true,
                link: true,
                read: true,
                createdAt: true,
                updatedAt: true,
            },
        }),
        prisma.user.findUnique({ where: { id: actorId }, select: { name: true, avatar: true } }),
    ]);

    // The same shape createNotification sends, so the bell reads both.
    await broadcastMany(
        created.map((n) => ({ channel: userChannel(n.recipientId), name: 'notification:new', data: { ...n, actor } })),
    );
    queuePush(recipientIds, {
        title: 'Campus Connect',
        body: `${actor?.name || 'Campus Connect'} ${message}`,
        url: link,
    });
    return created.length;
}

export async function createNotification(
    recipientId: string,
    actorId: string,
    type: Prisma.NotificationCreateInput['type'],
    message: string,
    link: string,
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

        // 2. Realtime, on the recipient's private channel (best effort)
        await broadcast(userChannel(recipientId), 'notification:new', notification);

        // 3. Push to their devices, for when the site is closed. Queued, not
        // awaited: the caller should not wait on, or fail for, a push service.
        queuePush([recipientId], {
            title: 'Campus Connect',
            body: `${notification.actor?.name || 'Campus Connect'} ${message}`,
            url: link,
        });

        return { success: true, notification };

    } catch (error) {
        console.error('Failed to create notification:', error);
        // Don't fail the whole action if notification fails, just log it
        return { success: false, error: 'Failed to create notification' };
    }
}
