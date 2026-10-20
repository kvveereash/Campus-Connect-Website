'use server';

import prisma from '@/lib/db';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, CACHE_TTL } from '@/lib/cache';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { ActionState } from '@/types';

import { createProtectedAction } from '@/lib/protected-action';
import { updateCollegeSchema } from '@/lib/schemas';
import { AuthorizationError } from '@/lib/errors';
import { isOk } from '@/lib/api-response';

// ─────────────────────────────────────────────────
// Protected Actions
// ─────────────────────────────────────────────────

export const updateCollegeAction = createProtectedAction(updateCollegeSchema, async (data, session) => {
    // 1. Verify ownership (Role check is handled by wrapper)
    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { collegeId: true }
    });

    if (!user || user.collegeId !== data.collegeId) {
        throw new AuthorizationError("You can only edit your own college");
    }

    // 2. Update College
    await prisma.college.update({
        where: { id: data.collegeId },
        data: {
            description: data.description,
            logo: data.logo,
            location: data.location,
            name: data.name
        }
    });

    revalidatePath(`/colleges/${data.collegeId}`);
    revalidatePath('/colleges');

    return { message: 'College profile updated successfully' };
}, {
    requiredRoles: ['COLLEGE_ADMIN'], // Enforces role check
    audit: { action: 'UPDATE', entityType: 'College', getEntityId: (d) => d.collegeId }
});

// ─────────────────────────────────────────────────
// Legacy Wrapper
// ─────────────────────────────────────────────────

/** @deprecated Use updateCollegeAction instead */
export async function updateCollege(
    collegeId: string,
    data: {
        description?: string;
        logo?: string;
        location?: string;
        name?: string;
    }
): Promise<ActionState> {
    const result = await updateCollegeAction({ collegeId, ...data });
    if (isOk(result)) {
        return { success: true, message: result.data.message };
    }
    return { success: false, error: result.error };
}

export async function getCollegesList() {
    try {
        const colleges = await prisma.college.findMany({
            select: { id: true, name: true }
        });
        return colleges;
    } catch (error) {
        console.error('Failed to get colleges list:', error);
        return [];
    }
}

async function _getAllCollegesUncached() {
    const colleges = await prisma.college.findMany({
            select: {
                id: true,
                name: true,
                location: true,
                logo: true,
                description: true,
                // What a campus actually has on it is more use on a listing
                // than its name alone. Only live, approved records are counted,
                // so the numbers match what a visitor can actually open.
                _count: {
                    select: {
                        students: { where: { deletedAt: null } },
                        clubs: { where: { verified: true, deletedAt: null } },
                        events: { where: { verified: true, deletedAt: null } },
                    },
                },
            },
            orderBy: { name: 'asc' },
        });

    return colleges.map((c) => ({
        id: c.id,
        name: c.name,
        location: c.location,
        logo: c.logo,
        description: c.description,
        students: c._count.students,
        clubs: c._count.clubs,
        events: c._count.events,
    }));
}

export async function getAllColleges() {
    try {
        // Colleges change rarely, so this is the cheapest cache in the app.
        const cached = unstable_cache(
            _getAllCollegesUncached,
            ['all-colleges'],
            { tags: [CACHE_TAGS.COLLEGES], revalidate: CACHE_TTL.COLLEGES }
        );
        return await cached();
    } catch (error) {
        console.error('Failed to get all colleges:', error);
        return [];
    }
}

export async function getCollegeById(id: string) {
    try {
        // Find by ID, if not valid CUID, this might throw or return null
        const college = await prisma.college.findUnique({
            where: { id },
            include: {
                // Approved, live clubs only, and only the fields the page shows.
                // This passed every club row to the client, so a college page
                // listed unapproved, rejected and deleted clubs along with
                // their rejection reasons.
                clubs: {
                    where: { verified: true, deletedAt: null },
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                        category: true,
                        description: true,
                        _count: {
                            select: { members: true }
                        }
                    }
                },
                events: {
                    where: { date: { gte: new Date() }, verified: true, deletedAt: null },
                    orderBy: { date: 'asc' },
                    take: 5
                },
                _count: {
                    select: { students: { where: { deletedAt: null } } }
                }
            }
        });
        return college;
    } catch (error) {
        console.error('Failed to get college by id:', error);
        return null;
    }
}
