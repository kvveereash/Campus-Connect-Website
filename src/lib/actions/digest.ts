'use server';

import { z } from 'zod';
import prisma from '@/lib/db';
import { createProtectedAction } from '@/lib/protected-action';
import { digestLimiter } from '@/lib/rate-limit';

/*
 * The Monday email on and off, from settings (src/components/settings/DigestToggle.tsx).
 * Always the session's own account: neither action takes a user id. The demo
 * account is refused by createProtectedAction's default, since it is shared
 * and its address is not anyone's inbox.
 */

export const getDigestSettings = createProtectedAction(z.object({}), async (_, session) => {
    const user = await prisma.user.findFirst({
        where: { id: session.userId, deletedAt: null },
        select: { weeklyDigest: true, emailVerified: true },
    });
    return { enabled: user?.weeklyDigest ?? false, verified: Boolean(user?.emailVerified) };
});

export const setWeeklyDigest = createProtectedAction(
    z.boolean(),
    async (enabled, session) => {
        const { count } = await prisma.user.updateMany({
            where: { id: session.userId, deletedAt: null },
            data: { weeklyDigest: enabled },
        });
        return { enabled: count > 0 ? enabled : false };
    },
    { rateLimiter: digestLimiter },
);
