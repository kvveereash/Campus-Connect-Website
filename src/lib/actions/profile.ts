'use server';

import prisma from '@/lib/db';

/**
 * Public profile data for any user, by id.
 *
 * Deliberately excludes `email` and every other contact/credential field: this
 * page is readable by anonymous visitors, so returning emails here would hand
 * out the whole student directory to a scraper. Anything added to this select
 * becomes public — check each field against that bar first.
 */
export async function getPublicProfile(userId: string) {
    try {
        const user = await prisma.user.findFirst({
            where: { id: userId, deletedAt: null },
            select: {
                id: true,
                name: true,
                avatar: true,
                department: true,
                year: true,
                bio: true,
                achievements: true,
                projects: true,
                portfolioLinks: true,
                createdAt: true,
                college: {
                    select: { id: true, name: true, logo: true, location: true },
                },
                skills: { select: { id: true, name: true } },
                interests: { select: { id: true, name: true } },
                badges: {
                    select: {
                        dateEarned: true,
                        badge: { select: { id: true, name: true, icon: true, description: true } },
                    },
                    orderBy: { dateEarned: 'desc' },
                },
                // Counted the way the lists below are filtered. These counted
                // cancelled and unpaid registrations, deleted and rejected
                // events and deleted clubs, so "9 attending" sat above 3.
                _count: {
                    select: {
                        registrations: {
                            where: { status: { in: ['PAID', 'COMPLETED'] }, event: { deletedAt: null, verified: true } },
                        },
                        createdEvents: { where: { deletedAt: null, verified: true } },
                        clubMemberships: { where: { club: { deletedAt: null, verified: true } } },
                    },
                },
            },
        });

        if (!user) return null;

        // These three columns hold JSON strings written by the profile editor.
        // A malformed value should degrade to an empty list, not crash the page.
        const safeParse = (raw: string | null): any[] => {
            if (!raw) return [];
            try {
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        };

        return {
            ...user,
            achievements: safeParse(user.achievements),
            projects: safeParse(user.projects),
            portfolioLinks: safeParse(user.portfolioLinks),
            badges: user.badges.map((ub) => ({ ...ub.badge, dateEarned: ub.dateEarned })),
        };
    } catch (error) {
        console.error('Failed to load public profile:', error);
        return null;
    }
}

export type PublicProfile = NonNullable<Awaited<ReturnType<typeof getPublicProfile>>>;

/**
 * Events this user has registered for, and events they created.
 * Only verified, non-deleted events — an unverified event is not public yet.
 */
export async function getPublicProfileEvents(userId: string) {
    try {
        const [registered, hosted] = await Promise.all([
            prisma.eventRegistration.findMany({
                where: { userId, status: { in: ['PAID', 'COMPLETED'] }, event: { deletedAt: null, verified: true } },
                select: {
                    event: {
                        include: {
                            hostCollege: { select: { id: true, name: true, logo: true } },
                            club: { select: { id: true, name: true, logo: true } },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: 12,
            }),
            prisma.event.findMany({
                where: { creatorId: userId, deletedAt: null, verified: true },
                include: {
                    hostCollege: { select: { id: true, name: true, logo: true } },
                    club: { select: { id: true, name: true, logo: true } },
                },
                orderBy: { date: 'desc' },
                take: 12,
            }),
        ]);

        return { registered: registered.map((r) => r.event), hosted };
    } catch (error) {
        console.error('Failed to load profile events:', error);
        return { registered: [], hosted: [] };
    }
}

/**
 * Headline counts for the landing page.
 *
 * These were previously hardcoded marketing numbers (12,000 students, 340
 * clubs, 50 colleges, 1,200 events) on a site with 14 users — the kind of
 * claim that does not survive being asked about. Real counts, rendered
 * honestly, are the better answer.
 */
export async function getPlatformStats() {
    try {
        const [students, clubs, colleges, events] = await Promise.all([
            prisma.user.count({ where: { deletedAt: null } }),
            prisma.club.count({ where: { deletedAt: null, verified: true } }),
            prisma.college.count(),
            prisma.event.count({ where: { deletedAt: null, verified: true } }),
        ]);

        return { students, clubs, colleges, events };
    } catch (error) {
        console.error('Failed to load platform stats:', error);
        return { students: 0, clubs: 0, colleges: 0, events: 0 };
    }
}
