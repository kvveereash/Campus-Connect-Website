import 'server-only';

import prisma from '@/lib/db';
import { Badge } from '@prisma/client';

/**
 * Award any badges the user has now earned.
 *
 * Internal, with no auth check: it trusts the userId it is given. It used to
 * be exported from lib/actions/events.ts, which made it a server action any
 * visitor could call to award badges to any account.
 */
export async function checkAndAwardBadges(userId: string, eventCategory: string) {
    const badgesEarned: Badge[] = [];

    try {
        const [
            registrationCount,
            hostedEventCount,
            existingUserBadges,
            allBadges
        ] = await Promise.all([
            prisma.eventRegistration.count({ where: { userId } }),
            eventCategory === 'HOST_EVENT'
                ? prisma.event.count({ where: { creatorId: userId } })
                : Promise.resolve(0),
            prisma.userBadge.findMany({
                where: { userId },
                select: { badge: { select: { name: true, id: true } } }
            }),
            prisma.badge.findMany({
                where: {
                    name: { in: ['Social Butterfly', 'Code Ninja', 'Event Planner'] }
                }
            })
        ]);

        const earnedBadgeNames = new Set(existingUserBadges.map(ub => ub.badge.name));
        const badgeMap = new Map(allBadges.map(b => [b.name, b]));
        const badgesToAward: { userId: string; badgeId: string }[] = [];

        if (registrationCount >= 5 && !earnedBadgeNames.has('Social Butterfly')) {
            const badge = badgeMap.get('Social Butterfly');
            if (badge) { badgesToAward.push({ userId, badgeId: badge.id }); badgesEarned.push(badge); }
        }

        if (eventCategory === 'Hackathon' && !earnedBadgeNames.has('Code Ninja')) {
            const badge = badgeMap.get('Code Ninja');
            if (badge) { badgesToAward.push({ userId, badgeId: badge.id }); badgesEarned.push(badge); }
        }

        if (eventCategory === 'HOST_EVENT' && hostedEventCount >= 1 && !earnedBadgeNames.has('Event Planner')) {
            const badge = badgeMap.get('Event Planner');
            if (badge) { badgesToAward.push({ userId, badgeId: badge.id }); badgesEarned.push(badge); }
        }

        if (badgesToAward.length > 0) {
            await prisma.userBadge.createMany({
                data: badgesToAward,
                skipDuplicates: true
            });
        }

        return badgesEarned;

    } catch (error) {
        console.error('Error awarding badges:', error);
        return [];
    }
}
