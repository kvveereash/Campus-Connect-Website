'use server';

import prisma from '@/lib/db';
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

export async function getAllColleges() {
    try {
        const colleges = await prisma.college.findMany({
            orderBy: { name: 'asc' }
        });
        return colleges;
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
                clubs: {
                    include: {
                        _count: {
                            select: { members: true }
                        }
                    }
                },
                events: {
                    where: { date: { gte: new Date() } },
                    orderBy: { date: 'asc' },
                    take: 5
                },
                _count: {
                    select: { students: true }
                }
            }
        });
        return college;
    } catch (error) {
        console.error('Failed to get college by id:', error);
        return null;
    }
}
