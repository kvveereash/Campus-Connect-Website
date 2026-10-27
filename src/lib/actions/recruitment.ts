'use server';

import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { revalidatePath, updateTag } from 'next/cache';
import prisma from '@/lib/db';
import { createProtectedAction } from '@/lib/protected-action';
import { cleanUserText } from '@/lib/sanitize';
import { applicationLimiter } from '@/lib/rate-limit';
import { createNotification } from '@/lib/notification-helper';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { CACHE_TAGS } from '@/lib/cache';
import {
    ANSWER_MAX_LENGTH,
    MAX_QUESTIONS,
    QUESTION_MAX_LENGTH,
    readAnswers,
    readQuestions,
    type ApplicationAnswer,
    type ApplicationState,
} from '@/lib/recruitment-rules';

/*
 * Club recruitment: a club's admins open applications with a few questions,
 * students apply once per club, and the admins accept or decline. Every
 * action here keeps createProtectedAction's default of refusing the shared
 * demo account: applying notifies real club admins, and deciding changes
 * another person's membership.
 */

export interface MyApplication {
    status: ApplicationState;
    answers: ApplicationAnswer[];
    createdAt: string;
    decidedAt: string | null;
}

export interface ClubApplicationView {
    id: string;
    status: ApplicationState;
    answers: ApplicationAnswer[];
    createdAt: string;
    applicant: {
        id: string;
        name: string;
        avatar: string | null;
        college: string | null;
    };
}

const idSchema = z.string().min(1).max(64);

const openSchema = z.object({
    clubId: idSchema,
    questions: z
        .array(
            z.string().max(QUESTION_MAX_LENGTH, `Keep each question to ${QUESTION_MAX_LENGTH} characters or fewer.`)
        )
        .min(1, 'Add at least one question.')
        .max(MAX_QUESTIONS, `Ask at most ${MAX_QUESTIONS} questions.`),
});

const clubOnlySchema = z.object({ clubId: idSchema });

const applySchema = z.object({
    clubId: idSchema,
    answers: z
        .array(z.string().max(ANSWER_MAX_LENGTH, `Keep each answer to ${ANSWER_MAX_LENGTH} characters or fewer.`))
        .min(1, 'Answer every question.')
        .max(MAX_QUESTIONS, 'Answer every question.'),
});

const decideSchema = z.object({
    applicationId: idSchema,
    decision: z.enum(['ACCEPTED', 'DECLINED']),
});

const NOT_ADMIN = 'Only this club’s admins can do that.';
const ALREADY_DECIDED = 'This application has already been decided. Reload to see the latest.';

async function requireClubAdmin(clubId: string, userId: string) {
    const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId, clubId } },
        select: { role: true },
    });
    if (membership?.role !== 'ADMIN') throw new AuthorizationError(NOT_ADMIN);
}

/**
 * The club page reads recruitment state on every request, but its member
 * list and counts come from the `club-<id>` cache entry and the listing from
 * the clubs tag, so both are refreshed after a write. `withList` is for writes
 * the listing shows: the Recruiting tag, and member counts after an accept.
 */
function refreshClub(clubId: string, withList: boolean) {
    revalidatePath(`/clubs/${clubId}`);
    updateTag(`club-${clubId}`);
    if (withList) {
        updateTag(CACHE_TAGS.CLUBS);
        revalidatePath('/clubs');
    }
}

const openRecruitmentAction = createProtectedAction(
    openSchema,
    async ({ clubId, questions }, session) => {
        await requireClubAdmin(clubId, session.userId);

        const cleaned = questions.map(cleanUserText).filter(Boolean);
        if (cleaned.length === 0) throw new ValidationError('Add at least one question.');

        const updated = await prisma.club.updateMany({
            where: { id: clubId, deletedAt: null },
            data: { recruiting: true, recruitQuestions: cleaned },
        });
        if (updated.count === 0) throw new NotFoundError('Club');

        refreshClub(clubId, true);
        return { recruiting: true, questions: cleaned };
    },
    { audit: { action: 'UPDATE', entityType: 'Club', getEntityId: (d) => d.clubId } }
);

const closeRecruitmentAction = createProtectedAction(
    clubOnlySchema,
    async ({ clubId }, session) => {
        await requireClubAdmin(clubId, session.userId);

        // The questions stay, so reopening next semester starts from them.
        // Pending applications stay too and can still be decided.
        await prisma.club.updateMany({
            where: { id: clubId, deletedAt: null },
            data: { recruiting: false },
        });

        refreshClub(clubId, true);
        return { recruiting: false };
    },
    { audit: { action: 'UPDATE', entityType: 'Club', getEntityId: (d) => d.clubId } }
);

const applyToClubAction = createProtectedAction(
    applySchema,
    async ({ clubId, answers }, session) => {
        const userId = session.userId;
        const [club, membership, existing, admins] = await Promise.all([
            prisma.club.findFirst({
                where: { id: clubId, verified: true, deletedAt: null },
                select: { id: true, name: true, recruiting: true, recruitQuestions: true },
            }),
            prisma.clubMember.findUnique({
                where: { userId_clubId: { userId, clubId } },
                select: { id: true },
            }),
            prisma.clubApplication.findUnique({
                where: { clubId_userId: { clubId, userId } },
                select: { id: true },
            }),
            prisma.clubMember.findMany({
                where: { clubId, role: 'ADMIN' },
                select: { userId: true },
            }),
        ]);

        if (!club) throw new NotFoundError('Club');
        if (membership) throw new ConflictError('You are already a member of this club.');
        if (!club.recruiting) throw new ConflictError('This club is not taking applications right now.');
        if (existing) throw new ConflictError('You have already applied to this club.');

        const questions = readQuestions(club.recruitQuestions);
        if (questions.length === 0 || answers.length !== questions.length) {
            // The admins changed the questions while the form was open.
            throw new ValidationError('The questions have changed. Reload the page and answer them again.');
        }

        const cleaned = answers.map(cleanUserText);
        if (cleaned.some((a) => !a)) throw new ValidationError('Answer every question.');

        const stored = questions.map((question, i) => ({ question, answer: cleaned[i] }));

        let created: { createdAt: Date };
        try {
            created = await prisma.clubApplication.create({
                data: { clubId, userId, answers: stored },
                select: { createdAt: true },
            });
        } catch (error) {
            // Two submits racing past the check above meet the unique index.
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictError('You have already applied to this club.');
            }
            throw error;
        }

        await Promise.all(
            admins.map((admin) =>
                createNotification(
                    admin.userId,
                    userId,
                    'CLUB_UPDATE',
                    `${session.user.name} applied to join ${club.name}.`,
                    `/clubs/${clubId}#applications`
                )
            )
        );

        refreshClub(clubId, false);
        return { status: 'PENDING' as const, createdAt: created.createdAt.toISOString() };
    },
    {
        rateLimiter: applicationLimiter,
        audit: { action: 'CREATE', entityType: 'Club', getEntityId: (d) => d.clubId },
    }
);

const getMyApplicationAction = createProtectedAction(
    clubOnlySchema,
    async ({ clubId }, session): Promise<MyApplication | null> => {
        const application = await prisma.clubApplication.findUnique({
            where: { clubId_userId: { clubId, userId: session.userId } },
            select: { status: true, answers: true, createdAt: true, decidedAt: true },
        });
        if (!application) return null;
        return {
            status: application.status,
            answers: readAnswers(application.answers),
            createdAt: application.createdAt.toISOString(),
            decidedAt: application.decidedAt?.toISOString() ?? null,
        };
    }
);

const getApplicationsAction = createProtectedAction(
    clubOnlySchema,
    async ({ clubId }, session): Promise<ClubApplicationView[]> => {
        // Both in one round trip. The list query carries the admin condition
        // itself, so it returns nothing to a non-admin even before the check.
        const [membership, rows] = await Promise.all([
            prisma.clubMember.findUnique({
                where: { userId_clubId: { userId: session.userId, clubId } },
                select: { role: true },
            }),
            prisma.clubApplication.findMany({
                where: {
                    clubId,
                    club: { members: { some: { userId: session.userId, role: 'ADMIN' } } },
                },
                select: {
                    id: true,
                    status: true,
                    answers: true,
                    createdAt: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            avatar: true,
                            college: { select: { name: true } },
                        },
                    },
                },
                // Postgres orders an enum by its declared order, PENDING first,
                // so the applications still waiting on a decision lead.
                orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
                take: 200,
            }),
        ]);

        if (membership?.role !== 'ADMIN') throw new AuthorizationError(NOT_ADMIN);

        return rows.map((row) => ({
            id: row.id,
            status: row.status,
            answers: readAnswers(row.answers),
            createdAt: row.createdAt.toISOString(),
            applicant: {
                id: row.user.id,
                name: row.user.name,
                avatar: row.user.avatar,
                college: row.user.college?.name ?? null,
            },
        }));
    }
);

const decideApplicationAction = createProtectedAction(
    decideSchema,
    async ({ applicationId, decision }, session) => {
        const application = await prisma.clubApplication.findUnique({
            where: { id: applicationId },
            select: { id: true, clubId: true, userId: true, status: true, club: { select: { name: true } } },
        });
        if (!application) throw new NotFoundError('Application');

        await requireClubAdmin(application.clubId, session.userId);
        if (application.status !== 'PENDING') throw new ConflictError(ALREADY_DECIDED);

        const { clubId, userId } = application;
        const decidedAt = new Date();

        await prisma.$transaction(async (tx) => {
            // Conditional on PENDING, so two admins deciding at once cannot
            // both win, and an accept is never undone by a late decline.
            const updated = await tx.clubApplication.updateMany({
                where: { id: applicationId, status: 'PENDING' },
                data: { status: decision, decidedAt },
            });
            if (updated.count === 0) throw new ConflictError(ALREADY_DECIDED);

            if (decision === 'ACCEPTED') {
                // An upsert, because the applicant may have joined some other
                // way meanwhile; an existing role (even ADMIN) is kept.
                await tx.clubMember.upsert({
                    where: { userId_clubId: { userId, clubId } },
                    create: { userId, clubId, role: 'MEMBER' },
                    update: {},
                });
            }
        });

        await createNotification(
            userId,
            session.userId,
            decision === 'ACCEPTED' ? 'CLUB_INVITE' : 'CLUB_UPDATE',
            decision === 'ACCEPTED'
                ? `${application.club.name} accepted your application. You are now a member.`
                : `${application.club.name} declined your application.`,
            `/clubs/${clubId}`
        );

        refreshClub(clubId, decision === 'ACCEPTED');
        if (decision === 'ACCEPTED') revalidatePath('/profile');

        return { id: applicationId, status: decision, decidedAt: decidedAt.toISOString() };
    },
    { audit: { action: 'UPDATE', entityType: 'Club', getEntityId: (d) => d.applicationId } }
);

// Each action validates one object with zod; callers get the plain positional form.

export async function openRecruitment(clubId: string, questions: string[]) {
    return openRecruitmentAction({ clubId, questions });
}

export async function closeRecruitment(clubId: string) {
    return closeRecruitmentAction({ clubId });
}

export async function applyToClub(clubId: string, answers: string[]) {
    return applyToClubAction({ clubId, answers });
}

export async function getMyApplication(clubId: string) {
    return getMyApplicationAction({ clubId });
}

export async function getApplications(clubId: string) {
    return getApplicationsAction({ clubId });
}

export async function decideApplication(applicationId: string, decision: 'ACCEPTED' | 'DECLINED') {
    return decideApplicationAction({ applicationId, decision });
}
