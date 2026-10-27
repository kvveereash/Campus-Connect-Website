'use server';

import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { revalidatePath, updateTag } from 'next/cache';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createProtectedAction } from '@/lib/protected-action';
import { cleanUserText } from '@/lib/sanitize';
import { festLimiter } from '@/lib/rate-limit';
import { createNotification } from '@/lib/notification-helper';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { CACHE_TAGS } from '@/lib/cache';
import { isAllowedImageUrl } from '@/lib/schemas';
import { canManageFest } from '@/app/fests/access';
import {
    FEST_LIMITS,
    FESTS_TAG,
    checkFestDates,
    festDayEnd,
    festDayStart,
    festTag,
} from '@/app/fests/rules';

/*
 * Fests: a named run of days that groups a college's events into one
 * timetable. A site admin, or an admin of an approved club, starts one; it
 * goes public once a site admin approves it, like events and clubs. Writes
 * keep createProtectedAction's default of refusing the shared demo account,
 * except saving a whole fest, which only touches the caller's own saves.
 */

export interface MyFest {
    id: string;
    name: string;
    collegeId: string;
    startDate: string;
    endDate: string;
    verified: boolean;
}

export interface PendingFest {
    id: string;
    name: string;
    tagline: string | null;
    description: string;
    startDate: string;
    endDate: string;
    createdAt: string;
    college: string;
    club: string | null;
    creator: string | null;
    eventCount: number;
}

const idSchema = z.string().min(1).max(64);
const dayKey = z.string().max(10);

const fieldsSchema = {
    name: z.string().max(FEST_LIMITS.NAME_MAX, `Keep the name to ${FEST_LIMITS.NAME_MAX} characters or fewer.`),
    tagline: z
        .string()
        .max(FEST_LIMITS.TAGLINE_MAX, `Keep the tagline to ${FEST_LIMITS.TAGLINE_MAX} characters or fewer.`)
        .optional(),
    description: z
        .string()
        .max(FEST_LIMITS.DESCRIPTION_MAX, `Keep the description to ${FEST_LIMITS.DESCRIPTION_MAX} characters or fewer.`),
    startDate: dayKey,
    endDate: dayKey,
    // Empty clears the cover; anything else must be an upload or a known host.
    coverImage: z
        .string()
        .max(2048, 'That image address is too long.')
        .refine((v) => v === '' || isAllowedImageUrl(v), 'Use an uploaded image for the cover.')
        .optional(),
};

const createSchema = z.object({
    ...fieldsSchema,
    clubId: idSchema.optional(),
    collegeId: idSchema.optional(),
});

const updateSchema = z.object({ festId: idSchema, ...fieldsSchema });
const festOnlySchema = z.object({ festId: idSchema });
const decideSchema = z.object({
    festId: idSchema,
    approve: z.boolean(),
    reason: z.string().max(500, 'Keep the reason to 500 characters or fewer.').optional(),
});

export type FestInput = Omit<z.infer<typeof createSchema>, 'clubId' | 'collegeId'>;

const NOT_MANAGER = 'Only the person who started this fest, its club’s admins or a site admin can do that.';

/** Cleans the text fields and checks the dates, or throws with what to fix. */
function readFields(input: FestInput, isNew: boolean) {
    const name = cleanUserText(input.name);
    const tagline = cleanUserText(input.tagline ?? '');
    const description = cleanUserText(input.description);
    if (name.length < FEST_LIMITS.NAME_MIN) {
        throw new ValidationError(`Give the fest a name of at least ${FEST_LIMITS.NAME_MIN} characters.`);
    }
    if (description.length < FEST_LIMITS.DESCRIPTION_MIN) {
        throw new ValidationError('Say a little more about the fest: what it is, and who it is for.');
    }
    const dateError = checkFestDates(input.startDate, input.endDate, { isNew });
    if (dateError) throw new ValidationError(dateError);

    return {
        name,
        tagline: tagline || null,
        description,
        startDate: festDayStart(input.startDate),
        endDate: festDayEnd(input.endDate),
        coverImage: input.coverImage?.trim() || null,
    };
}

/**
 * The fest pages and board are unstable_cache reads tagged FESTS_TAG and
 * fest-<id>; revalidatePath alone would not reach them (see the note above
 * createEventAction in events.ts).
 */
function refreshFest(festId: string) {
    revalidatePath('/fests');
    revalidatePath(`/fests/${festId}`);
    revalidatePath(`/fests/${festId}/edit`);
    revalidatePath('/admin/fests');
    updateTag(FESTS_TAG);
    updateTag(festTag(festId));
}

async function managedFest(festId: string, session: { userId: string; user: { role: string } }) {
    const fest = await prisma.fest.findFirst({
        where: { id: festId, deletedAt: null },
        select: {
            id: true,
            name: true,
            tagline: true,
            description: true,
            startDate: true,
            endDate: true,
            coverImage: true,
            creatorId: true,
            clubId: true,
            verified: true,
        },
    });
    if (!fest) throw new NotFoundError('Fest');
    if (!(await canManageFest(fest, session.userId, session.user.role))) throw new AuthorizationError(NOT_MANAGER);
    return fest;
}

const createFestAction = createProtectedAction(
    createSchema,
    async (input, session) => {
        const fields = readFields(input, true);
        const isSiteAdmin = session.user.role === 'ADMIN';

        let collegeId: string;
        let clubId: string | null = null;
        if (input.clubId) {
            const [club, membership] = await Promise.all([
                prisma.club.findFirst({
                    where: { id: input.clubId, verified: true, deletedAt: null },
                    select: { id: true, collegeId: true },
                }),
                prisma.clubMember.findUnique({
                    where: { userId_clubId: { userId: session.userId, clubId: input.clubId } },
                    select: { role: true },
                }),
            ]);
            if (!club) throw new ValidationError('Pick an approved club to host the fest.');
            if (!isSiteAdmin && membership?.role !== 'ADMIN') {
                throw new AuthorizationError('Only an admin of an approved club can start a fest for it.');
            }
            // The fest is at the club's college, whatever the form said.
            collegeId = club.collegeId;
            clubId = club.id;
        } else {
            if (!isSiteAdmin) {
                throw new AuthorizationError('Pick the club hosting the fest. Its admins are the ones who can start one.');
            }
            const college = input.collegeId
                ? await prisma.college.findUnique({ where: { id: input.collegeId }, select: { id: true } })
                : null;
            if (!college) throw new ValidationError('Pick the college the fest is at.');
            collegeId = college.id;
        }

        const fest = await prisma.fest.create({
            data: { ...fields, collegeId, clubId, creatorId: session.userId, verified: isSiteAdmin },
            select: { id: true, verified: true },
        });

        // A site admin is the approver, so their fest is live at once; anyone
        // else's only reaches the admin queue.
        refreshFest(fest.id);
        return fest;
    },
    {
        rateLimiter: festLimiter,
        audit: { action: 'CREATE', entityType: 'Fest', getEntityId: () => 'new' },
    }
);

const updateFestAction = createProtectedAction(
    updateSchema,
    async ({ festId, ...input }, session) => {
        const fest = await managedFest(festId, session);
        const fields = readFields(input, false);

        const changed =
            fields.name !== fest.name ||
            fields.tagline !== fest.tagline ||
            fields.description !== fest.description ||
            fields.coverImage !== fest.coverImage ||
            fields.startDate.getTime() !== fest.startDate.getTime() ||
            fields.endDate.getTime() !== fest.endDate.getTime();

        // Like events: a change to an approved fest goes back to the admin
        // queue, so approval is not a one-time check later edits walk around.
        // A site admin's own edit needs no second look.
        const backToQueue = fest.verified && changed && session.user.role !== 'ADMIN';

        await prisma.fest.update({
            where: { id: festId },
            data: { ...fields, ...(backToQueue ? { verified: false } : {}) },
            select: { id: true },
        });

        refreshFest(festId);
        return { id: festId, verified: fest.verified && !backToQueue, backToQueue };
    },
    { audit: { action: 'UPDATE', entityType: 'Fest', getEntityId: (d) => d.festId } }
);

/** Detach the events first, so none of them links to a fest that is gone. */
async function retireFest(festId: string) {
    await prisma.$transaction([
        prisma.event.updateMany({ where: { festId }, data: { festId: null } }),
        prisma.fest.update({ where: { id: festId }, data: { deletedAt: new Date() }, select: { id: true } }),
    ]);
    refreshFest(festId);
    // Event pages show "Part of …" from their own cache entries.
    updateTag(CACHE_TAGS.EVENTS);
}

const deleteFestAction = createProtectedAction(
    festOnlySchema,
    async ({ festId }, session) => {
        await managedFest(festId, session);
        await retireFest(festId);
        return { deleted: true };
    },
    { audit: { action: 'DELETE', entityType: 'Fest', getEntityId: (d) => d.festId } }
);

const decideFestAction = createProtectedAction(
    decideSchema,
    async ({ festId, approve, reason }, session) => {
        const fest = await prisma.fest.findFirst({
            where: { id: festId, deletedAt: null },
            select: { id: true, name: true, creatorId: true, verified: true },
        });
        if (!fest) throw new NotFoundError('Fest');

        if (approve) {
            if (fest.verified) throw new ConflictError('This fest is already approved. Reload to see the latest.');
            await prisma.fest.update({ where: { id: festId }, data: { verified: true }, select: { id: true } });
            refreshFest(festId);
        } else {
            // A fest has no rejection reason column, so a refused fest is
            // retired; the reason travels in the notification instead.
            await retireFest(festId);
        }

        if (fest.creatorId && fest.creatorId !== session.userId) {
            // Ends in a full stop either way, so the next sentence reads on.
            const why = reason ? cleanUserText(reason).replace(/[.?]?$/, '.') : '';
            await createNotification(
                fest.creatorId,
                session.userId,
                'EVENT_UPDATE',
                approve
                    ? `approved your fest ${fest.name}. Its timetable is on the board now.`
                    : `did not approve your fest ${fest.name}${why && why !== '.' ? `: ${why}` : '.'} You can start it again with the changes.`,
                approve ? `/fests/${festId}` : '/fests/create'
            );
        }

        return { id: festId, approved: approve };
    },
    {
        requireAdmin: true,
        audit: {
            action: (d) => (d.approve ? 'APPROVE' : 'REJECT'),
            entityType: 'Fest',
            getEntityId: (d) => d.festId,
        },
    }
);

const saveWholeFestAction = createProtectedAction(
    festOnlySchema,
    async ({ festId }, session) => {
        const where = upcomingFestEvents(festId);
        const [fest, events] = await Promise.all([
            prisma.fest.findFirst({ where: { id: festId, verified: true, deletedAt: null }, select: { id: true } }),
            prisma.event.findMany({ where, select: { id: true }, orderBy: { date: 'asc' }, take: 200 }),
        ]);
        if (!fest) throw new NotFoundError('Fest');
        if (events.length === 0) throw new ConflictError('Every event in this fest has already happened.');

        // skipDuplicates: events saved one by one before stay as they were,
        // reminder state included.
        const created = await prisma.eventInterest.createMany({
            data: events.map((e) => ({ userId: session.userId, eventId: e.id })),
            skipDuplicates: true,
        });
        return { added: created.count, total: events.length };
    },
    // Saving is private to the account, as with the single-event Interested
    // button, so the shared demo may do it too.
    { allowDemo: true }
);

const getPendingFestsAction = createProtectedAction(
    z.object({}),
    async (): Promise<PendingFest[]> => {
        const rows = await prisma.fest.findMany({
            where: { verified: false, deletedAt: null },
            select: {
                id: true,
                name: true,
                tagline: true,
                description: true,
                startDate: true,
                endDate: true,
                createdAt: true,
                college: { select: { name: true } },
                club: { select: { name: true } },
                creator: { select: { name: true } },
                _count: { select: { events: { where: { deletedAt: null } } } },
            },
            orderBy: { createdAt: 'asc' },
            take: 100,
        });
        return rows.map((f) => ({
            id: f.id,
            name: f.name,
            tagline: f.tagline,
            description: f.description,
            startDate: f.startDate.toISOString(),
            endDate: f.endDate.toISOString(),
            createdAt: f.createdAt.toISOString(),
            college: f.college.name,
            club: f.club?.name ?? null,
            creator: f.creator?.name ?? null,
            eventCount: f._count.events,
        }));
    },
    { requireAdmin: true }
);

/** The events "save the whole fest" picks: approved, live and still to come. */
function upcomingFestEvents(festId: string): Prisma.EventWhereInput {
    return { festId, verified: true, deletedAt: null, date: { gte: new Date() } };
}

// Each action validates one object with zod; callers get the plain positional form.

export async function createFest(input: FestInput & { clubId?: string; collegeId?: string }) {
    return createFestAction(input);
}

export async function updateFest(festId: string, input: FestInput) {
    return updateFestAction({ festId, ...input });
}

export async function deleteFest(festId: string) {
    return deleteFestAction({ festId });
}

export async function decideFest(festId: string, approve: boolean, reason?: string) {
    return decideFestAction({ festId, approve, reason });
}

export async function saveWholeFest(festId: string) {
    return saveWholeFestAction({ festId });
}

/** Fests waiting for approval, oldest first. Site admins only. */
export async function getPendingFests() {
    return getPendingFestsAction({});
}

/**
 * How many of a fest's upcoming events the signed-in student has saved, out
 * of how many there are. Asked for by the browser, since the fest page is
 * shared by everyone. Zeroes when signed out.
 */
export async function getFestSaveProgress(festId: string): Promise<{ saved: number; total: number }> {
    const session = await getSession();
    if (!session?.userId || typeof festId !== 'string' || festId.length > 64) return { saved: 0, total: 0 };
    const where = upcomingFestEvents(festId);
    const [total, saved] = await Promise.all([
        prisma.event.count({ where }),
        prisma.eventInterest.count({ where: { userId: session.userId as string, event: where } }),
    ]);
    return { saved, total };
}

/** Whether the signed-in person may edit this fest; false when signed out. */
export async function viewerCanManageFest(festId: string): Promise<boolean> {
    const session = await getSession();
    if (!session?.userId || typeof festId !== 'string' || festId.length > 64) return false;
    const fest = await prisma.fest.findFirst({
        where: { id: festId, deletedAt: null },
        select: { creatorId: true, clubId: true },
    });
    if (!fest) return false;
    return canManageFest(fest, session.userId as string, (session.user?.role as string) ?? 'USER');
}

/**
 * Fests the signed-in person may put events into: ones they started, ones
 * run by a club they are an admin of, or any for a site admin. Ended fests
 * are left out. Empty when signed out.
 */
export async function getMyFests(): Promise<MyFest[]> {
    const session = await getSession();
    if (!session?.userId) return [];
    const userId = session.userId as string;
    const isSiteAdmin = session.user?.role === 'ADMIN';

    const rows = await prisma.fest.findMany({
        where: {
            deletedAt: null,
            endDate: { gte: new Date() },
            ...(isSiteAdmin
                ? {}
                : { OR: [{ creatorId: userId }, { club: { members: { some: { userId, role: 'ADMIN' } } } }] }),
        },
        select: { id: true, name: true, collegeId: true, startDate: true, endDate: true, verified: true },
        orderBy: { startDate: 'asc' },
        take: 100,
    });
    return rows.map((f) => ({
        ...f,
        startDate: f.startDate.toISOString(),
        endDate: f.endDate.toISOString(),
    }));
}
