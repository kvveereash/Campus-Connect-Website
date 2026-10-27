'use server';

import { z } from 'zod';
import prisma from '@/lib/db';
import { createProtectedAction } from '@/lib/protected-action';
import { pushSubscribeLimiter } from '@/lib/rate-limit';

/*
 * Turning push notifications on and off for this browser
 * (src/components/PushToggle.tsx). The demo account is refused by
 * createProtectedAction's default: it is shared, so a device subscribed to it
 * would get every other visitor's demo notifications.
 */

const endpointSchema = z
    .string()
    .max(1000, 'That push address is too long')
    .url('That push address is not valid')
    .refine((url) => url.startsWith('https://'), 'That push address is not valid');

const subscriptionSchema = z.object({
    endpoint: endpointSchema,
    keys: z.object({
        p256dh: z.string().min(1, 'The subscription is missing its key').max(200),
        auth: z.string().min(1, 'The subscription is missing its key').max(100),
    }),
});

export const savePushSubscription = createProtectedAction(
    subscriptionSchema,
    async ({ endpoint, keys }, session) => {
        // Upsert by endpoint and re-point it: the same browser signed in as
        // someone else must stop receiving the previous person's notifications.
        await prisma.pushSubscription.upsert({
            where: { endpoint },
            create: { userId: session.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
            update: { userId: session.userId, p256dh: keys.p256dh, auth: keys.auth },
            select: { id: true },
        });
        return null;
    },
    { rateLimiter: pushSubscribeLimiter },
);

export const removePushSubscription = createProtectedAction(endpointSchema, async (endpoint, session) => {
    // Scoped to the caller, so an endpoint alone cannot switch off someone else's device.
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: session.userId } });
    return null;
});
