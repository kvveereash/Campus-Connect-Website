'use server';

import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';
import { getSession } from '@/lib/auth';
import { DEMO_REFUSAL, isDemoEmail } from '@/lib/demo-account';
import { revalidatePath } from 'next/cache';
import { isOk } from '@/lib/api-response';

import { createProtectedAction } from '@/lib/protected-action';
import { teamRequestSchema } from '@/lib/schemas';
import { checkRateLimit, commentLimiter, getRateLimitIdentifier, postLimiter } from '@/lib/rate-limit';

// ─────────────────────────────────────────────────
// Protected Actions (unified pattern)
// ─────────────────────────────────────────────────

export const createTeamRequestAction = createProtectedAction(teamRequestSchema, async (data, session) => {
    const user = await prisma.user.findUnique({
        where: { id: session.userId }
    });

    if (!user) throw new Error('User not found');

    // Only on live, approved events (deleted and pending ones accepted posts).
    const event = await prisma.event.findFirst({ where: { id: data.eventId, verified: true, deletedAt: null }, select: { id: true } });
    if (!event) throw new Error('Event not found');

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
    // Each request is listed publicly on the event page.
    rateLimiter: postLimiter,
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
            // Public read: only for approved, live events.
            where: { eventId, event: { verified: true, deletedAt: null } },
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
        if (isDemoEmail(session?.user?.email)) return { success: false, error: DEMO_REFUSAL };
        if (!session || !session.userId) {
            return { success: false, error: 'Unauthorized' };
        }

        const request = await prisma.teamRequest.findUnique({ where: { id } });
        if (!request) return { success: false, error: 'Request not found' };
        if (request.creatorId !== session.userId) {
            return { success: false, error: 'Unauthorized' };
        }

        // Validated like a new request. Unchecked, `skills: "abc"` was stored
        // and TeamRequestCard's skills.map() then crashed the event page's
        // team section for every visitor.
        const parsed = teamRequestSchema
            .pick({ type: true, skills: true, description: true })
            .partial()
            .safeParse(data);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' };
        }

        const updateData: Prisma.TeamRequestUpdateInput = {};
        if (parsed.data.type) updateData.type = parsed.data.type;
        if (parsed.data.skills) updateData.skills = JSON.stringify(parsed.data.skills);
        if (parsed.data.description) updateData.description = parsed.data.description;

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
        if (isDemoEmail(session?.user?.email)) return { success: false, error: DEMO_REFUSAL };
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
        if (isDemoEmail(session?.user?.email)) return { success: false, error: DEMO_REFUSAL };
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

        // Throttled, so a script cannot flood the creator with notifications.
        const limit = await checkRateLimit(commentLimiter, `${getRateLimitIdentifier(session.userId as string)}:team-connect`);
        if (!limit.success) {
            return { success: false, error: 'Slow down. Try again in a minute.' };
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
