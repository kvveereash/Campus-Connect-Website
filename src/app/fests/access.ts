import 'server-only';
import prisma from '@/lib/db';
import { mayManageFest } from './rules';

/*
 * Permission checks for fests that need the database. Not a 'use server'
 * module on purpose: these take a user id and a role as arguments, and as
 * server actions anyone could call them claiming to be an admin. They are
 * for server code that already holds a session.
 */

/** Whether this person may edit the fest and attach events to it. */
export async function canManageFest(
    fest: { creatorId: string | null; clubId: string | null },
    userId: string,
    role: string
): Promise<boolean> {
    // The cheap answers first, so a creator or site admin costs no query.
    if (mayManageFest({ role, userId, creatorId: fest.creatorId, isClubAdmin: false })) return true;
    if (!fest.clubId) return false;
    const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId, clubId: fest.clubId } },
        select: { role: true },
    });
    return membership?.role === 'ADMIN';
}

/**
 * For the event create and edit actions: may this person put an event hosted
 * at `hostCollegeId` into this fest? The fest must be live (not deleted), at
 * the same college, and theirs to manage. A fest still waiting for approval
 * counts, so organisers can build the timetable while they wait.
 */
export async function canAttachEventToFest(
    festId: string,
    userId: string,
    role: string,
    hostCollegeId: string
): Promise<boolean> {
    const fest = await prisma.fest.findFirst({
        where: { id: festId, deletedAt: null },
        select: { collegeId: true, creatorId: true, clubId: true },
    });
    if (!fest || fest.collegeId !== hostCollegeId) return false;
    return canManageFest(fest, userId, role);
}

export interface FestHosts {
    /** Approved clubs this person is an admin of. */
    clubs: { id: string; name: string; collegeName: string }[];
    /** Every college, for a site admin starting a fest with no club; null for everyone else. */
    colleges: { id: string; name: string }[] | null;
}

/** What the create form may offer as the fest's host. Empty means they cannot start one. */
export async function getFestHosts(userId: string, role: string): Promise<FestHosts> {
    const isSiteAdmin = role === 'ADMIN';
    const [memberships, colleges] = await Promise.all([
        prisma.clubMember.findMany({
            where: { userId, role: 'ADMIN', club: { verified: true, deletedAt: null } },
            select: { club: { select: { id: true, name: true, college: { select: { name: true } } } } },
            orderBy: { club: { name: 'asc' } },
            take: 50,
        }),
        isSiteAdmin
            ? prisma.college.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 1000 })
            : Promise.resolve(null),
    ]);
    return {
        clubs: memberships.map((m) => ({ id: m.club.id, name: m.club.name, collegeName: m.club.college.name })),
        colleges,
    };
}
