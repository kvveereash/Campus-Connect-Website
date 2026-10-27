'use server';

import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createProtectedAction } from '@/lib/protected-action';
import { createNotification } from '@/lib/notification-helper';
import { cleanUserText } from '@/lib/sanitize';
import { volunteerLimiter } from '@/lib/rate-limit';
import { canManageEvent } from '@/lib/ticket';
import { AuthorizationError, ConflictError, ValidationError } from '@/lib/errors';
import {
    ROLE_DESCRIPTION_MAX,
    ROLE_NAME_MAX,
    ROLE_SLOTS_MAX,
    ROLES_PER_EVENT_MAX,
} from '@/components/volunteers/limits';

/*
 * Volunteer roles on an event: the organiser lists what they need (the
 * registration desk, stage, tech) and how many people for each, students
 * sign up for one, and the role is printed on their certificate.
 *
 * Every write keeps createProtectedAction's default of refusing the shared
 * demo account: signing up notifies a real organiser, and removing a role
 * notifies real volunteers.
 */

type Tx = Prisma.TransactionClient;
type Session = { userId: string; user?: { role?: string } };

const id = z.string().min(1).max(50);
const name = z
    .string()
    .max(ROLE_NAME_MAX, `Keep the role name to ${ROLE_NAME_MAX} characters or fewer.`);
const description = z
    .string()
    .max(ROLE_DESCRIPTION_MAX, `Keep the description to ${ROLE_DESCRIPTION_MAX} characters or fewer.`);
const slots = z
    .number({ error: 'Give the number of people as a number.' })
    .int('Give the number of people as a whole number.')
    .min(1, 'A role needs room for at least 1 person.')
    .max(ROLE_SLOTS_MAX, `A role can take at most ${ROLE_SLOTS_MAX} people.`);

const NOT_ORGANISER = 'Only the organisers of this event can change its volunteer roles.';
const ROLE_GONE = 'That role has been removed. Reload the page to see the latest.';

const people = (n: number) => (n === 1 ? '1 person has' : `${n} people have`);

function cleanName(value: string) {
    const cleaned = cleanUserText(value);
    if (!cleaned) throw new ValidationError('Give the role a name, such as Registration desk.');
    return cleaned;
}

async function managedEvent(eventId: string, session: Session) {
    const event = await prisma.event.findFirst({
        where: { id: eventId, deletedAt: null },
        select: { id: true, title: true, date: true, creatorId: true, clubId: true },
    });
    if (!event || !(await canManageEvent(event, session))) throw new AuthorizationError(NOT_ORGANISER);
    return event;
}

async function managedRole(roleId: string, session: Session) {
    const role = await prisma.volunteerRole.findFirst({
        where: { id: roleId, event: { deletedAt: null } },
        select: {
            id: true,
            name: true,
            event: { select: { id: true, title: true, date: true, creatorId: true, clubId: true } },
        },
    });
    if (!role) throw new ValidationError(ROLE_GONE);
    if (!(await canManageEvent(role.event, session))) throw new AuthorizationError(NOT_ORGANISER);
    return role;
}

/**
 * Holds the role's row until the transaction ends, so two people cannot both
 * take its last slot and an organiser cannot lower its slots under a sign-up
 * that is landing. Returns the slots as they are now, or null if the role was
 * removed in the meantime.
 */
async function lockRole(tx: Tx, roleId: string) {
    const rows = await tx.$queryRaw<{ slots: number }[]>`SELECT "slots" FROM "VolunteerRole" WHERE "id" = ${roleId} FOR UPDATE`;
    return rows[0]?.slots ?? null;
}

/*
 * One role per person per event, but the unique index is per role. Two
 * sign-ups for different roles of the same event (a double tap, two tabs)
 * lock different role rows, so this person's sign-ups for the event are also
 * queued behind a transaction-scoped advisory lock, released at commit.
 */
async function lockPersonAtEvent(tx: Tx, eventId: string, userId: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${eventId}), hashtext(${userId}))`;
}

const refreshOrganiserPage = (eventId: string) => revalidatePath(`/events/${eventId}/attendees`);

/* ─── Organiser ─── */

export const addVolunteerRoleAction = createProtectedAction(
    z.object({ eventId: id, name, description: description.optional(), slots }),
    async (input, session) => {
        const event = await managedEvent(input.eventId, session);
        if (event.date < new Date()) {
            throw new ValidationError('This event has already happened, so it cannot take volunteers now.');
        }
        const roleName = cleanName(input.name);
        const [count, sameName] = await Promise.all([
            prisma.volunteerRole.count({ where: { eventId: event.id } }),
            prisma.volunteerRole.findFirst({
                where: { eventId: event.id, name: { equals: roleName, mode: 'insensitive' } },
                select: { id: true },
            }),
        ]);
        if (count >= ROLES_PER_EVENT_MAX) {
            throw new ValidationError(`An event can have up to ${ROLES_PER_EVENT_MAX} roles. Remove one to add another.`);
        }
        if (sameName) throw new ConflictError(`There is already a role called ${roleName}. Change its slots instead.`);

        const role = await prisma.volunteerRole.create({
            data: {
                eventId: event.id,
                name: roleName,
                description: cleanUserText(input.description ?? '') || null,
                slots: input.slots,
            },
            select: { id: true },
        });
        refreshOrganiserPage(event.id);
        return { id: role.id };
    },
    { rateLimiter: volunteerLimiter, audit: { action: 'UPDATE', entityType: 'Event', getEntityId: (d) => d.eventId } },
);

/** Renames a role or changes its slots. Slots never go below the people already signed up. */
export const updateVolunteerRoleAction = createProtectedAction(
    z.object({ roleId: id, name: name.optional(), description: description.optional(), slots: slots.optional() }),
    async (input, session) => {
        const role = await managedRole(input.roleId, session);
        const roleName = input.name === undefined ? undefined : cleanName(input.name);
        if (roleName && roleName.toLowerCase() !== role.name.toLowerCase()) {
            const sameName = await prisma.volunteerRole.findFirst({
                where: { eventId: role.event.id, id: { not: role.id }, name: { equals: roleName, mode: 'insensitive' } },
                select: { id: true },
            });
            if (sameName) throw new ConflictError(`There is already a role called ${roleName}.`);
        }

        const updated = await prisma.$transaction(async (tx) => {
            if ((await lockRole(tx, role.id)) === null) throw new ValidationError(ROLE_GONE);
            if (input.slots !== undefined) {
                const taken = await tx.volunteerSignup.count({ where: { roleId: role.id } });
                if (input.slots < taken) {
                    throw new ValidationError(
                        `${people(taken)} signed up already, so this role needs at least ${taken} slots. Remove the role to start again.`,
                    );
                }
            }
            return tx.volunteerRole.update({
                where: { id: role.id },
                data: {
                    name: roleName,
                    description: input.description === undefined ? undefined : cleanUserText(input.description) || null,
                    slots: input.slots,
                },
                select: { id: true, name: true, description: true, slots: true },
            });
        });
        refreshOrganiserPage(role.event.id);
        return updated;
    },
    { rateLimiter: volunteerLimiter, audit: { action: 'UPDATE', entityType: 'Event', getEntityId: (d) => d.roleId } },
);

/** Removes a role; anyone who had signed up for it is told. */
export const removeVolunteerRoleAction = createProtectedAction(
    z.object({ roleId: id }),
    async ({ roleId }, session) => {
        const role = await managedRole(roleId, session);
        const volunteers = await prisma.$transaction(async (tx) => {
            if ((await lockRole(tx, role.id)) === null) return [];
            const signups = await tx.volunteerSignup.findMany({ where: { roleId: role.id }, select: { userId: true } });
            // The sign-ups go with it (onDelete: Cascade).
            await tx.volunteerRole.delete({ where: { id: role.id } });
            return signups.map((s) => s.userId).filter((userId) => userId !== session.userId);
        });

        // In batches, so a big role doesn't open dozens of connections at once.
        for (let i = 0; i < volunteers.length; i += 25) {
            await Promise.all(
                volunteers.slice(i, i + 25).map((userId) =>
                    createNotification(
                        userId,
                        session.userId,
                        'EVENT_UPDATE',
                        `removed the ${role.name} volunteer role from ${role.event.title}, so you are no longer down to volunteer. You can pick another role on the event page.`,
                        `/events/${role.event.id}`,
                    ),
                ),
            );
        }
        refreshOrganiserPage(role.event.id);
        return { removed: true, notified: volunteers.length };
    },
    { rateLimiter: volunteerLimiter, audit: { action: 'UPDATE', entityType: 'Event', getEntityId: (d) => d.roleId } },
);

/* ─── Students ─── */

/** Signs the caller up for a role: one role per event, while slots last. */
export const volunteerForRoleAction = createProtectedAction(
    z.object({ roleId: id }),
    async ({ roleId }, session) => {
        const userId = session.userId;
        const role = await prisma.volunteerRole.findFirst({
            where: { id: roleId, event: { deletedAt: null } },
            select: {
                id: true,
                name: true,
                event: { select: { id: true, title: true, date: true, verified: true, creatorId: true } },
            },
        });
        if (!role) throw new ValidationError(ROLE_GONE);
        const { event } = role;
        if (!event.verified) throw new ValidationError('Volunteering opens once the event is approved.');
        if (event.date < new Date()) throw new ValidationError('This event has already happened.');

        const taken = await prisma.$transaction(async (tx) => {
            await lockPersonAtEvent(tx, event.id, userId);
            const roomFor = await lockRole(tx, role.id);
            if (roomFor === null) throw new ValidationError(ROLE_GONE);

            const [held, signedUp] = await Promise.all([
                tx.volunteerSignup.findFirst({
                    where: { userId, role: { eventId: event.id } },
                    select: { roleId: true, role: { select: { name: true } } },
                }),
                tx.volunteerSignup.count({ where: { roleId: role.id } }),
            ]);
            if (held?.roleId === role.id) throw new ConflictError(`You are already down as ${role.name}.`);
            if (held) {
                throw new ConflictError(
                    `You are already volunteering as ${held.role.name} at this event. Withdraw from that first to switch.`,
                );
            }
            if (signedUp >= roomFor) throw new ConflictError(`Every ${role.name} slot is taken. Try another role.`);

            await tx.volunteerSignup.create({ data: { roleId: role.id, userId }, select: { id: true } });
            return signedUp + 1;
        });

        if (event.creatorId && event.creatorId !== userId) {
            await createNotification(
                event.creatorId,
                userId,
                'EVENT_JOIN',
                `signed up to volunteer as ${role.name} at ${event.title}`,
                `/events/${event.id}/attendees`,
            );
        }
        refreshOrganiserPage(event.id);
        return { roleId: role.id, taken };
    },
    { rateLimiter: volunteerLimiter, audit: { action: 'CREATE', entityType: 'Registration', getEntityId: (d) => d.roleId } },
);

/** Gives up the caller's role, before the event. Afterwards it stays on their record. */
export const withdrawFromRoleAction = createProtectedAction(
    z.object({ roleId: id }),
    async ({ roleId }, session) => {
        const userId = session.userId;
        const signup = await prisma.volunteerSignup.findUnique({
            where: { roleId_userId: { roleId, userId } },
            select: {
                id: true,
                role: { select: { name: true, event: { select: { id: true, title: true, date: true, creatorId: true } } } },
            },
        });
        if (!signup) throw new ValidationError('You are not down for this role. Reload the page to see the latest.');
        const { event } = signup.role;
        if (event.date < new Date()) {
            throw new ValidationError('This event has already happened, so the role stays on your record.');
        }

        await prisma.volunteerSignup.deleteMany({ where: { id: signup.id } });
        if (event.creatorId && event.creatorId !== userId) {
            await createNotification(
                event.creatorId,
                userId,
                'EVENT_UPDATE',
                `can no longer volunteer as ${signup.role.name} at ${event.title}`,
                `/events/${event.id}/attendees`,
            );
        }
        refreshOrganiserPage(event.id);
        return { withdrawn: true };
    },
    { rateLimiter: volunteerLimiter, audit: { action: 'DELETE', entityType: 'Registration', getEntityId: (d) => d.roleId } },
);

/* ─── Reads ─── */

export type VolunteerRoleView = {
    id: string;
    name: string;
    description: string | null;
    slots: number;
    taken: number;
};

export type EventVolunteering = {
    roles: VolunteerRoleView[];
    /** The role the caller holds at this event, if any. */
    myRoleId: string | null;
    signedIn: boolean;
    /** Approved, so sign-ups are open (the page itself knows whether it is past). */
    verified: boolean;
};

/**
 * The roles on an event, for the event page in the browser: how many slots
 * each has and how many are taken, and which one the caller holds. Counts
 * only, never who: the volunteer list is for the organisers.
 */
export async function getEventVolunteering(eventId: string): Promise<EventVolunteering> {
    const none: EventVolunteering = { roles: [], myRoleId: null, signedIn: false, verified: false };
    if (typeof eventId !== 'string' || !eventId || eventId.length > 50) return none;
    const session = await getSession();
    const userId = (session?.userId as string | undefined) ?? null;

    const [event, roles, mine] = await Promise.all([
        prisma.event.findFirst({ where: { id: eventId, deletedAt: null }, select: { verified: true } }),
        prisma.volunteerRole.findMany({
            where: { eventId },
            orderBy: { createdAt: 'asc' },
            take: ROLES_PER_EVENT_MAX,
            select: { id: true, name: true, description: true, slots: true, _count: { select: { signups: true } } },
        }),
        userId
            ? prisma.volunteerSignup.findFirst({ where: { userId, role: { eventId } }, select: { roleId: true } })
            : null,
    ]);
    if (!event) return none;

    return {
        roles: roles.map((r) => ({
            id: r.id,
            name: r.name,
            description: r.description,
            slots: r.slots,
            taken: r._count.signups,
        })),
        myRoleId: mine?.roleId ?? null,
        signedIn: Boolean(userId),
        verified: event.verified,
    };
}

export type OrganiserVolunteerRole = VolunteerRoleView & {
    volunteers: { id: string; name: string; avatar: string | null }[];
};

/**
 * The roles with who signed up for each, for the attendee page. It checks
 * the caller runs the event itself: a 'use server' export can be called from
 * the browser, so it cannot rely on the page having checked.
 */
export async function getVolunteerRolesForOrganiser(eventId: string): Promise<OrganiserVolunteerRole[]> {
    if (typeof eventId !== 'string' || !eventId || eventId.length > 50) return [];
    const session = await getSession();
    if (!session?.userId) return [];

    const [event, roles] = await Promise.all([
        prisma.event.findFirst({ where: { id: eventId, deletedAt: null }, select: { id: true, creatorId: true, clubId: true } }),
        prisma.volunteerRole.findMany({
            where: { eventId },
            orderBy: { createdAt: 'asc' },
            take: ROLES_PER_EVENT_MAX,
            select: {
                id: true,
                name: true,
                description: true,
                slots: true,
                signups: {
                    orderBy: { createdAt: 'asc' },
                    select: { user: { select: { id: true, name: true, avatar: true } } },
                },
            },
        }),
    ]);
    if (!event || !(await canManageEvent(event, { userId: session.userId as string, user: session.user }))) return [];

    return roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        slots: r.slots,
        taken: r.signups.length,
        volunteers: r.signups.map((s) => s.user),
    }));
}
