'use server';

import { z } from 'zod';
import type { Prisma, ReportReason, ReportTarget } from '@prisma/client';
import { revalidatePath, updateTag } from 'next/cache';
import prisma from '@/lib/db';
import { createProtectedAction } from '@/lib/protected-action';
import { reportLimiter } from '@/lib/rate-limit';
import { cleanUserText } from '@/lib/sanitize';
import { audit, type AuditEntityType } from '@/lib/audit';
import { createNotification } from '@/lib/notification-helper';
import { CACHE_TAGS } from '@/lib/cache';
import { ValidationError } from '@/lib/errors';
import { REPORT_DETAILS_MAX, REPORT_TARGET_NOUN } from '@/lib/report-reasons';

const TARGETS = ['EVENT', 'POST', 'COMMENT', 'CLUB', 'USER'] as const;
const REASONS = ['SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'MISLEADING', 'OTHER'] as const;

/** Where a removal notice points: the rules the content was measured against. */
const GUIDELINES_LINK = '/legal/guidelines';

// ─────────────────────────────────────────────────
// Targets
// ─────────────────────────────────────────────────

interface ResolvedTarget {
    /** Everyone who answers for this content: told when it is removed, never allowed to report it. */
    ownerIds: string[];
    /** A short human name for the thing, for notices and the audit log. */
    label: string;
    /** The club whose page shows it, so a removal refreshes that page's cache. */
    clubId: string | null;
    /** For a comment, the post whose count drops when it goes. */
    postId?: string;
}

/**
 * The live target and who owns it, or null when it does not exist (or is
 * already soft-deleted). One small select per type, so nothing about the
 * owner beyond their id leaves the database.
 */
async function findTarget(targetType: ReportTarget, targetId: string): Promise<ResolvedTarget | null> {
    switch (targetType) {
        case 'EVENT': {
            const event = await prisma.event.findUnique({
                where: { id: targetId },
                select: { title: true, creatorId: true, clubId: true, deletedAt: true },
            });
            if (!event || event.deletedAt) return null;
            return { ownerIds: event.creatorId ? [event.creatorId] : [], label: event.title, clubId: event.clubId };
        }
        case 'POST': {
            const post = await prisma.post.findUnique({
                where: { id: targetId },
                select: { content: true, authorId: true, clubId: true },
            });
            if (!post) return null;
            return { ownerIds: [post.authorId], label: excerpt(post.content, 60), clubId: post.clubId };
        }
        case 'COMMENT': {
            const comment = await prisma.comment.findUnique({
                where: { id: targetId },
                select: { content: true, authorId: true, postId: true, post: { select: { clubId: true } } },
            });
            if (!comment) return null;
            return {
                ownerIds: [comment.authorId],
                label: excerpt(comment.content, 60),
                clubId: comment.post.clubId,
                postId: comment.postId,
            };
        }
        case 'CLUB': {
            const club = await prisma.club.findUnique({
                where: { id: targetId },
                select: {
                    name: true,
                    deletedAt: true,
                    members: { where: { role: 'ADMIN' }, select: { userId: true } },
                },
            });
            if (!club || club.deletedAt) return null;
            return { ownerIds: club.members.map((m) => m.userId), label: club.name, clubId: targetId };
        }
        case 'USER': {
            const user = await prisma.user.findUnique({
                where: { id: targetId },
                select: { name: true, deletedAt: true },
            });
            if (!user || user.deletedAt) return null;
            return { ownerIds: [targetId], label: user.name, clubId: null };
        }
    }
}

function excerpt(text: string, max: number): string {
    const flat = text.replace(/\s+/g, ' ').trim();
    return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

// ─────────────────────────────────────────────────
// Reporting
// ─────────────────────────────────────────────────

const reportSchema = z.object({
    targetType: z.enum(TARGETS),
    targetId: z.string().min(1).max(64),
    reason: z.enum(REASONS),
    details: z
        .string()
        .max(REPORT_DETAILS_MAX, `Keep the details under ${REPORT_DETAILS_MAX} characters.`)
        .optional(),
});

export const reportContent = createProtectedAction(
    reportSchema,
    async (data, session) => {
        const target = await findTarget(data.targetType, data.targetId);
        if (!target) {
            throw new ValidationError('That is no longer on Campus Connect, so there is nothing to report.');
        }

        if (target.ownerIds.includes(session.userId)) {
            throw new ValidationError(
                data.targetType === 'USER'
                    ? 'You cannot report yourself.'
                    : `You cannot report your own ${REPORT_TARGET_NOUN[data.targetType]}.`
            );
        }

        const details = data.details ? cleanUserText(data.details).slice(0, REPORT_DETAILS_MAX) : '';

        /* One report per person per thing (a unique index). A second report
           changes nothing, so mashing the button cannot inflate the count or
           rewrite what was first said, and the reporter is thanked either way:
           telling them "already reported" adds nothing they can act on. */
        await prisma.report.upsert({
            where: {
                reporterId_targetType_targetId: {
                    reporterId: session.userId,
                    targetType: data.targetType,
                    targetId: data.targetId,
                },
            },
            create: {
                reporterId: session.userId,
                targetType: data.targetType,
                targetId: data.targetId,
                reason: data.reason,
                details: details || null,
            },
            update: {},
            select: { id: true },
        });

        return { reported: true as const };
    },
    { rateLimiter: reportLimiter }
);

// ─────────────────────────────────────────────────
// Admin queue
// ─────────────────────────────────────────────────

export interface ReportGroup {
    targetType: ReportTarget;
    targetId: string;
    count: number;
    /** Each reason given, most common first. */
    reasons: { reason: ReportReason; count: number }[];
    latestDetails: string | null;
    /** ISO time of the first open report: the queue is oldest first. */
    firstReportedAt: string;
    lastReportedAt: string;
    /** Event title, club or person's name, or a clip of the post or comment. Null when it is already gone. */
    excerpt: string | null;
    /** Who wrote or runs it, where that is not the excerpt itself. */
    ownerName: string | null;
    href: string | null;
}

/** Enough for any admin to work through in one sitting; older ones stay until these clear. */
const QUEUE_LIMIT = 500;

const loadQueue = createProtectedAction(
    z.undefined(),
    async (): Promise<ReportGroup[]> => {
        const reports = await prisma.report.findMany({
            where: { status: 'OPEN' },
            select: { targetType: true, targetId: true, reason: true, details: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
            take: QUEUE_LIMIT,
        });

        // Grouped in order of each target's oldest report, which is the queue order.
        const groups = new Map<string, ReportGroup & { reasonCounts: Map<ReportReason, number> }>();
        for (const r of reports) {
            const key = `${r.targetType}:${r.targetId}`;
            let group = groups.get(key);
            if (!group) {
                group = {
                    targetType: r.targetType,
                    targetId: r.targetId,
                    count: 0,
                    reasons: [],
                    reasonCounts: new Map(),
                    latestDetails: null,
                    firstReportedAt: r.createdAt.toISOString(),
                    lastReportedAt: r.createdAt.toISOString(),
                    excerpt: null,
                    ownerName: null,
                    href: null,
                };
                groups.set(key, group);
            }
            group.count += 1;
            group.reasonCounts.set(r.reason, (group.reasonCounts.get(r.reason) ?? 0) + 1);
            group.lastReportedAt = r.createdAt.toISOString();
            if (r.details) group.latestDetails = r.details;
        }

        const idsOf = (type: ReportTarget) =>
            [...groups.values()].filter((g) => g.targetType === type).map((g) => g.targetId);
        // Skips the round trip to Mumbai for a type nobody reported.
        const readIf = <T>(ids: string[], read: () => Promise<T[]>): Promise<T[]> =>
            ids.length ? read() : Promise.resolve([]);
        const eventIds = idsOf('EVENT');
        const postIds = idsOf('POST');
        const commentIds = idsOf('COMMENT');
        const clubIds = idsOf('CLUB');
        const userIds = idsOf('USER');

        const [events, posts, comments, clubs, users] = await Promise.all([
            readIf(eventIds, () =>
                prisma.event.findMany({
                    where: { id: { in: eventIds }, deletedAt: null },
                    select: { id: true, title: true, creator: { select: { name: true } } },
                })
            ),
            readIf(postIds, () =>
                prisma.post.findMany({
                    where: { id: { in: postIds } },
                    select: {
                        id: true,
                        content: true,
                        clubId: true,
                        author: { select: { name: true } },
                        club: { select: { name: true } },
                    },
                })
            ),
            readIf(commentIds, () =>
                prisma.comment.findMany({
                    where: { id: { in: commentIds } },
                    select: {
                        id: true,
                        content: true,
                        author: { select: { name: true } },
                        post: { select: { clubId: true } },
                    },
                })
            ),
            readIf(clubIds, () =>
                prisma.club.findMany({
                    where: { id: { in: clubIds }, deletedAt: null },
                    select: { id: true, name: true },
                })
            ),
            readIf(userIds, () =>
                prisma.user.findMany({
                    where: { id: { in: userIds }, deletedAt: null },
                    select: { id: true, name: true },
                })
            ),
        ]);

        for (const e of events) {
            const g = groups.get(`EVENT:${e.id}`);
            if (g) Object.assign(g, { excerpt: e.title, ownerName: e.creator?.name ?? null, href: `/events/${e.id}` });
        }
        for (const p of posts) {
            const g = groups.get(`POST:${p.id}`);
            if (g) {
                Object.assign(g, {
                    excerpt: excerpt(p.content, 180),
                    ownerName: `${p.author.name} in ${p.club.name}`,
                    href: `/clubs/${p.clubId}`,
                });
            }
        }
        for (const c of comments) {
            const g = groups.get(`COMMENT:${c.id}`);
            if (g) Object.assign(g, { excerpt: excerpt(c.content, 180), ownerName: c.author.name, href: `/clubs/${c.post.clubId}` });
        }
        for (const c of clubs) {
            const g = groups.get(`CLUB:${c.id}`);
            if (g) Object.assign(g, { excerpt: c.name, href: `/clubs/${c.id}` });
        }
        for (const u of users) {
            const g = groups.get(`USER:${u.id}`);
            if (g) Object.assign(g, { excerpt: u.name, href: `/profile/${u.id}` });
        }

        return [...groups.values()].map(({ reasonCounts, ...group }) => ({
            ...group,
            reasons: [...reasonCounts.entries()]
                .map(([reason, count]) => ({ reason, count }))
                .sort((a, b) => b.count - a.count),
        }));
    },
    { requireAdmin: true }
);

/** Open reports, one row per reported thing, oldest first. Admins only. */
export async function getReportQueue() {
    return loadQueue(undefined);
}

// ─────────────────────────────────────────────────
// Resolving
// ─────────────────────────────────────────────────

const resolveSchema = z.object({
    targetType: z.enum(TARGETS),
    targetId: z.string().min(1).max(64),
    action: z.enum(['REMOVE', 'DISMISS']),
});

const AUDIT_ENTITY: Record<ReportTarget, AuditEntityType> = {
    EVENT: 'Event',
    POST: 'Post',
    // The audit log has no comment type; a comment is part of a post.
    COMMENT: 'Post',
    CLUB: 'Club',
    USER: 'User',
};

const resolveAction = createProtectedAction(
    resolveSchema,
    async ({ targetType, targetId, action }, session) => {
        const now = new Date();
        const status = action === 'REMOVE' ? 'ACTION_TAKEN' : 'DISMISSED';
        const closeReports = prisma.report.updateMany({
            where: { targetType, targetId, status: 'OPEN' },
            data: { status, resolvedAt: now, resolvedById: session.userId },
        });

        const target = action === 'REMOVE' ? await findTarget(targetType, targetId) : null;
        const removal: Prisma.PrismaPromise<unknown>[] = [];
        // Cache tags to refresh once the removal has committed.
        const tags: string[] = [];
        const paths: string[] = [];

        if (action === 'REMOVE' && target) {
            switch (targetType) {
                case 'EVENT':
                    // Soft, as deleteEvent does: paid registrations must outlive the listing.
                    removal.push(prisma.event.update({ where: { id: targetId }, data: { deletedAt: now } }));
                    tags.push(`event-${targetId}`, CACHE_TAGS.EVENTS);
                    paths.push('/events', '/profile');
                    break;
                case 'CLUB':
                    removal.push(prisma.club.update({ where: { id: targetId }, data: { deletedAt: now } }));
                    tags.push(CACHE_TAGS.CLUBS);
                    paths.push('/clubs');
                    break;
                case 'POST':
                    // Posts have no deletedAt; this is the same delete deleteClubPost runs.
                    removal.push(prisma.post.delete({ where: { id: targetId } }));
                    tags.push(CACHE_TAGS.CLUBS);
                    break;
                case 'COMMENT':
                    // As deletePostComment: the comment goes and its post's count follows.
                    removal.push(prisma.comment.delete({ where: { id: targetId } }));
                    if (target.postId) {
                        removal.push(
                            prisma.post.update({ where: { id: target.postId }, data: { comments: { decrement: 1 } } })
                        );
                    }
                    tags.push(CACHE_TAGS.CLUBS);
                    break;
                case 'USER':
                    // Accounts are never removed from here; that stays a deliberate, manual step.
                    break;
            }
            if (removal.length > 0 && target.clubId) {
                tags.push(`club-${target.clubId}`);
                paths.push(`/clubs/${target.clubId}`);
            }
        }

        // The removal and the closing of its reports land together or not at all.
        const results = await prisma.$transaction([...removal, closeReports]);
        const closed = (results[results.length - 1] as { count: number }).count;

        tags.forEach((tag) => updateTag(tag));
        [...paths, '/admin', '/admin/reports'].forEach((path) => revalidatePath(path));

        const removed = removal.length > 0;
        if (removed && target) {
            const noun = REPORT_TARGET_NOUN[targetType];
            const message =
                targetType === 'EVENT' || targetType === 'CLUB'
                    ? `An admin removed your ${noun} "${target.label}" after it was reported. It broke the community guidelines.`
                    : `An admin removed your ${noun} after it was reported. It broke the community guidelines.`;
            await Promise.all(
                target.ownerIds.map((ownerId) =>
                    createNotification(ownerId, session.userId, 'SYSTEM', message, GUIDELINES_LINK)
                )
            );
        }

        await audit(session.userId, action === 'REMOVE' ? 'DELETE' : 'REJECT', AUDIT_ENTITY[targetType], targetId, {
            source: 'report-queue',
            targetType,
            decision: action,
            reportsClosed: closed,
            contentRemoved: removed,
            ...(target ? { label: target.label } : {}),
        });

        return {
            closed,
            removed,
            note:
                targetType === 'USER' && action === 'REMOVE'
                    ? 'Reports closed. Nothing was changed on the account; any action on it is manual.'
                    : null,
        };
    },
    { requireAdmin: true }
);

/** Close every open report on one thing, removing the thing first when asked. Admins only. */
export async function resolveReports(targetType: ReportTarget, targetId: string, action: 'REMOVE' | 'DISMISS') {
    return resolveAction({ targetType, targetId, action });
}
