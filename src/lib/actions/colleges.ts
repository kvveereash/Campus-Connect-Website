'use server';

import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { ActionState } from '@/types';

export async function updateCollege(
    collegeId: string,
    data: {
        description?: string;
        logo?: string;
        location?: string;
        name?: string; // Usually name isn't changed often, but option is good
    }
): Promise<ActionState> {
    try {
        const session = await getSession();
        if (!session?.userId) {
            return { success: false, error: 'Unauthorized' };
        }

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { role: true, collegeId: true }
        });

        // Authorization Check
        if (user?.role !== 'COLLEGE_ADMIN') {
            return { success: false, error: 'Permission denied: Must be a College Admin' };
        }

        if (user.collegeId !== collegeId) {
            return { success: false, error: 'Permission denied: You can only edit your own college' };
        }

        // Update
        await prisma.college.update({
            where: { id: collegeId },
            data: {
                description: data.description,
                logo: data.logo,
                location: data.location,
                name: data.name
            }
        });

        revalidatePath(`/colleges/${collegeId}`);
        revalidatePath('/colleges');

        return { success: true, message: 'College profile updated successfully' };
    } catch (error) {
        console.error('Failed to update college:', error);
        return { success: false, error: 'Internal server error' };
    }
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
