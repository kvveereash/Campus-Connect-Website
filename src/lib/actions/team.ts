'use server';

import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { TeamRequest } from '@/types';
import { isOk } from '@/lib/api-response';

import { createProtectedAction } from '@/lib/protected-action';
import { teamRequestSchema } from '@/lib/schemas';

// ─────────────────────────────────────────────────
// Protected Actions (unified pattern)
// ─────────────────────────────────────────────────

export const createTeamRequestAction = createProtectedAction(teamRequestSchema, async (data, session) => {
    const user = await prisma.user.findUnique({
        where: { id: session.userId }
    });

    if (!user) throw new Error('User not found');

    const request = await prisma.teamRequest.create({
        data: {
            eventId: data.eventId,
            creatorId: session.userId,
            creatorName: user.name,
            type: data.type,
            skills: JSON.stringify(data.skills),
            description: data.description
        }
    });

    revalidatePath(`/events/${data.eventId}`);
    return request;
}, {
    audit: { action: 'CREATE', entityType: 'TeamRequest', getEntityId: (d) => d.eventId },
});

// ─────────────────────────────────────────────────
// Legacy Wrapper
// ─────────────────────────────────────────────────

/** @deprecated Use createTeamRequestAction directly */
export async function createTeamRequest(data: {
    eventId: string;
    type: string;
    skills: string[];
    description: string;
}) {
    const validation = teamRequestSchema.safeParse(data);
    if (!validation.success) return { success: false, error: validation.error.issues[0].message };

    const result = await createTeamRequestAction({
        ...data,
        type: data.type as 'LOOKING_FOR_TEAM' | 'LOOKING_FOR_MEMBER'
    });
    if (!isOk(result)) return { success: false, error: result.error };
    return { success: true, request: result.data };
}

// ─────────────────────────────────────────────────
// Data Queries & Mutations (raw pattern — kept for simplicity)
// ─────────────────────────────────────────────────

export async function getTeamRequestsByEvent(eventId: string) {
    try {
        const requests = await prisma.teamRequest.findMany({
            where: { eventId },
            orderBy: { createdAt: 'desc' },
            include: {
                creator: {
                    select: { id: true, name: true, avatar: true }
                }
            }
        });

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

        const request = await prisma.teamRequest.findUnique({ where: { id } });
        if (!request) return { success: false, error: 'Request not found' };
        if (request.creatorId !== session.userId) {
            return { success: false, error: 'Unauthorized' };
        }

        const updateData: any = {};
        if (data.type) updateData.type = data.type;
        if (data.skills) updateData.skills = JSON.stringify(data.skills);
        if (data.description) updateData.description = data.description;

        await prisma.teamRequest.update({ where: { id }, data: updateData });

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

        const request = await prisma.teamRequest.findUnique({ where: { id } });
        if (!request) return { success: false, error: 'Request not found' };
        if (request.creatorId !== session.userId) {
            return { success: false, error: 'Unauthorized' };
        }

        await prisma.teamRequest.delete({ where: { id } });

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
            include: { event: true }
        });

        if (!request) return { success: false, error: 'Request not found' };

        if (request.creatorId === session.userId) {
            return { success: false, error: 'Cannot connect to your own request' };
        }

        const { createNotification } = await import('@/lib/notification-helper');

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
