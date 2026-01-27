'use server';

import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { TeamRequest } from '@/types';

import { createSafeAction } from '@/lib/safe-action';
import { teamRequestSchema } from '@/lib/schemas';

// Safe Action Implementation
export const createTeamRequestSafe = createSafeAction(teamRequestSchema, async (data) => {
    const session = await getSession();
    if (!session || !session.userId) {
        throw new Error('Unauthorized');
    }

    const user = await prisma.user.findUnique({
        where: { id: session.userId as string }
    });

    if (!user) throw new Error('User not found');

    const request = await prisma.teamRequest.create({
        data: {
            eventId: data.eventId,
            creatorId: session.userId as string,
            creatorName: user.name,
            type: data.type,
            skills: JSON.stringify(data.skills),
            description: data.description
        }
    });

    revalidatePath(`/events/${data.eventId}`);
    return request;
});

// Legacy wrapper for backward compatibility (optional, but good practice during migration)
export async function createTeamRequest(data: {
    eventId: string;
    type: string;
    skills: string[];
    description: string;
}) {
    // Manually validating using safe action logic? Or just bridging.
    // For now, let's keep the original implementation or redirect to safe action if formats align.
    // Since we changed the schema to array, the original implementation's "skills.join" vs schema check might slightly differ.
    // Let's Replace the BODY of this function to call the safe action?
    // Actually, safe action returns { data, error }. The original returned { success, request, error }.
    // Let's keep original for now and users can switch to safe one.
    // BUT I will proactively update the original to USE the new schema validation at least to ensure consistency.

    const session = await getSession();
    if (!session || !session.userId) return { success: false, error: 'Unauthorized' };

    // Validate with new schema (which expects array)
    const validation = teamRequestSchema.safeParse(data);
    if (!validation.success) return { success: false, error: validation.error.issues[0].message };

    const result = await createTeamRequestSafe({
        ...data,
        type: data.type as 'LOOKING_FOR_TEAM' | 'LOOKING_FOR_MEMBER'
    });
    if (result.error) return { success: false, error: result.error };
    return { success: true, request: result.data };
}

export async function getTeamRequestsByEvent(eventId: string) {
    try {
        const requests = await prisma.teamRequest.findMany({
            where: { eventId },
            orderBy: { createdAt: 'desc' },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true
                    }
                }
            }
        });

        // Map to match the frontend type if needed, or update frontend type
        return requests.map(req => ({
            id: req.id,
            eventId: req.eventId,
            creatorId: req.creatorId,
            creatorName: req.creatorName,
            type: req.type as 'LOOKING_FOR_TEAM' | 'LOOKING_FOR_MEMBER',
            skills: JSON.parse(req.skills),
            description: req.description,
            createdAt: req.createdAt.toISOString()
        }));
    } catch (error) {
        console.error('Failed to get team requests:', error);
        return [];
    }
}

export async function updateTeamRequest(id: string, data: Partial<{
    type: string;
    skills: string[];
    description: string;
}>) {
    try {
        const session = await getSession();
        if (!session || !session.userId) {
            return { success: false, error: 'Unauthorized' };
        }

        const request = await prisma.teamRequest.findUnique({
            where: { id }
        });

        if (!request) return { success: false, error: 'Request not found' };
        if (request.creatorId !== session.userId) {
            return { success: false, error: 'Unauthorized' };
        }

        const updateData: any = {};
        if (data.type) updateData.type = data.type;
        if (data.skills) updateData.skills = JSON.stringify(data.skills);
        if (data.description) updateData.description = data.description;

        await prisma.teamRequest.update({
            where: { id },
            data: updateData
        });

        revalidatePath(`/events/${request.eventId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to update team request:', error);
        return { success: false, error: 'Failed to update request' };
    }
}

export async function deleteTeamRequest(id: string) {
    try {
        const session = await getSession();
        if (!session || !session.userId) {
            return { success: false, error: 'Unauthorized' };
        }

        const request = await prisma.teamRequest.findUnique({
            where: { id }
        });

        if (!request) return { success: false, error: 'Request not found' };
        if (request.creatorId !== session.userId) {
            return { success: false, error: 'Unauthorized' };
        }

        await prisma.teamRequest.delete({
            where: { id }
        });

        revalidatePath(`/events/${request.eventId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to delete team request:', error);
        return { success: false, error: 'Failed to delete request' };
    }
}

export async function connectToTeamRequest(requestId: string) {
    try {
        const session = await getSession();
        if (!session || !session.userId) {
            return { success: false, error: 'Unauthorized' };
        }

        const request = await prisma.teamRequest.findUnique({
            where: { id: requestId },
            include: { event: true } // Include event for context
        });

        if (!request) return { success: false, error: 'Request not found' };

        // Prevent self-connection
        if (request.creatorId === session.userId) {
            return { success: false, error: 'Cannot connect to your own request' };
        }

        // Trigger Notification
        const { createNotification } = await import('@/lib/actions/notifications');

        await createNotification(
            request.creatorId,
            session.userId,
            'TEAM_CONNECT',
            `wants to connect for ${request.event.title}: "${request.type === 'LOOKING_FOR_TEAM' ? 'Looking for a team' : 'Looking for members'}"`,
            `/events/${request.eventId}`
        );

        return { success: true, message: 'Connection request sent!' };

    } catch (error) {
        console.error('Failed to connect to team request:', error);
        return { success: false, error: 'Failed to send connection request' };
    }
}
