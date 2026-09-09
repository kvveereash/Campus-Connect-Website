'use server';

import prisma from '@/lib/db';

export interface LeaderboardUser {
    id: string;
    name: string;
    avatar: string | null;
    college: string;
    score: number;
    rank: number;
}

export interface LeaderboardClub {
    id: string;
    name: string;
    logo: string | null;
    college: string;
    memberCount: number;
    eventCount: number;
    rank: number;
}

/**
 * Get top event attendees (most events registered).
 *
 * Every query in this file ran without a deletedAt filter, and the club
 * board without a verified filter — so a deleted account or an unapproved
 * club would have appeared in the standings, linking to a page that 404s.
 */
export async function getTopAttendees(limit = 10) {
    try {
        const users = await prisma.user.findMany({
            where: { deletedAt: null },
            select: {
                id: true,
                name: true,
                avatar: true,
                college: { select: { name: true } },
                _count: {
                    select: {
                        registrations: {
                            where: { status: { in: ['PAID', 'COMPLETED'] } }
                        }
                    }
                }
            },
            orderBy: {
                registrations: { _count: 'desc' }
            },
            take: limit
        });

        return users.map((user, index) => ({
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            college: user.college?.name || 'Unknown',
            score: user._count.registrations,
            rank: index + 1
        }));
    } catch (error) {
        console.error('Failed to get top attendees:', error);
        return [];
    }
}

/**
 * Get top event hosts (most events created)
 */
export async function getTopHosts(limit = 10) {
    try {
        const users = await prisma.user.findMany({
            where: {
                deletedAt: null,
                createdEvents: { some: {} }
            },
            select: {
                id: true,
                name: true,
                avatar: true,
                college: { select: { name: true } },
                _count: {
                    select: { createdEvents: true }
                }
            },
            orderBy: {
                createdEvents: { _count: 'desc' }
            },
            take: limit
        });

        return users.map((user, index) => ({
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            college: user.college?.name || 'Unknown',
            score: user._count.createdEvents,
            rank: index + 1
        }));
    } catch (error) {
        console.error('Failed to get top hosts:', error);
        return [];
    }
}

/**
 * Get most active clubs (by member + event count)
 */
export async function getTopClubs(limit = 10) {
    try {
        const clubs = await prisma.club.findMany({
            where: { deletedAt: null, verified: true },
            select: {
                id: true,
                name: true,
                logo: true,
                college: { select: { name: true } },
                _count: {
                    select: {
                        members: true,
                        events: true
                    }
                }
            },
            orderBy: [
                { members: { _count: 'desc' } },
                { events: { _count: 'desc' } }
            ],
            take: limit
        });

        return clubs.map((club, index) => ({
            id: club.id,
            name: club.name,
            logo: club.logo,
            college: club.college?.name || 'Unknown',
            memberCount: club._count.members,
            eventCount: club._count.events,
            rank: index + 1
        }));
    } catch (error) {
        console.error('Failed to get top clubs:', error);
        return [];
    }
}

/**
 * Get users with most badges
 */
export async function getTopBadgeHolders(limit = 10) {
    try {
        const users = await prisma.user.findMany({
            where: {
                deletedAt: null,
                badges: { some: {} }
            },
            select: {
                id: true,
                name: true,
                avatar: true,
                college: { select: { name: true } },
                _count: {
                    select: { badges: true }
                }
            },
            orderBy: {
                badges: { _count: 'desc' }
            },
            take: limit
        });

        return users.map((user, index) => ({
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            college: user.college?.name || 'Unknown',
            score: user._count.badges,
            rank: index + 1
        }));
    } catch (error) {
        console.error('Failed to get top badge holders:', error);
        return [];
    }
}

/**
 * Get all leaderboards at once
 */
export async function getAllLeaderboards() {
    const [attendees, hosts, clubs, badges] = await Promise.all([
        getTopAttendees(10),
        getTopHosts(10),
        getTopClubs(10),
        getTopBadgeHolders(10)
    ]);

    return { attendees, hosts, clubs, badges };
}
