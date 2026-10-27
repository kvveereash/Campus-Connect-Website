import 'server-only';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { DEMO_EMAIL, isDemoEmail } from '@/lib/demo-account';
import { emailEnabled, sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { SITE_URL } from '@/lib/site';
import { GOING, digestUnsubscribeToken, ticketsEnabled } from '@/lib/ticket';
import { renderDigestEmail, type DigestItem } from '@/lib/digest-email';

/*
 * The weekly digest: on Monday morning (IST), everyone who opted in and has a
 * confirmed address gets one email of what is on in the next seven days.
 *
 * Called by /api/cron/digest, one bounded batch per call. The database is in
 * Mumbai and the function in Ohio, so every round trip costs about a quarter
 * of a second: a batch is read in a handful of queries for everyone at once,
 * never per person per section.
 *
 * Each person is claimed before anything is sent: one UPDATE sets
 * digestSentAt only where it is still empty or more than six days old, and
 * returns the ids it changed. Two overlapping runs cannot both claim the same
 * person, so nobody gets two copies. A claimed person keeps the claim even
 * when there was nothing to tell them or the send failed: that is "handled
 * this week", and retrying a failing address every few seconds helps nobody.
 * Only people the batch ran out of time for are released for the next call.
 */

export const DIGEST_BATCH_SIZE = 50;
/* Resend allows a couple of requests a second on the default plan; two at a
   time stays under that and still clears a batch well inside a function's
   time limit. */
const SEND_CONCURRENCY = 2;
/* Netlify stops a function at 10 seconds by default. Sending stops at 7 so
   the release of unsent claims and the response still fit. */
const SEND_BUDGET_MS = 7_000;
export const DIGEST_MAX_ITEMS = 8;
const RESEND_AFTER_MS = 6 * 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/*
 * Interests are free text people pick on their profile ("Coding", "Music");
 * event categories are a short fixed list. There is no real link between the
 * two, so this is a loose, hand-made map from category to words that suggest
 * it, the same idea the "For you" picks use. A match only ever adds an event
 * at the lowest priority, and its line says "close to your interest in X"
 * rather than claiming a perfect fit.
 */
const CATEGORY_WORDS: Record<string, string[]> = {
    Technology: ['tech', 'technology', 'code', 'coding', 'programming', 'software', 'web', 'app', 'ai', 'ml', 'machine learning', 'data', 'data science', 'cloud', 'cyber', 'cybersecurity', 'security', 'robotics', 'electronics', 'development', 'developer'],
    Hackathon: ['hackathon', 'hackathons', 'code', 'coding', 'programming', 'building', 'startup', 'product'],
    Cultural: ['culture', 'cultural', 'music', 'dance', 'drama', 'theatre', 'singing', 'film', 'poetry', 'literature'],
    Art: ['art', 'arts', 'design', 'drawing', 'painting', 'photography', 'illustration'],
    Workshop: ['workshop', 'workshops', 'learning', 'skills', 'writing'],
    Sports: ['sport', 'sports', 'football', 'cricket', 'basketball', 'fitness', 'athletics', 'badminton', 'chess'],
    Business: ['business', 'entrepreneurship', 'finance', 'marketing', 'startup', 'management', 'economics'],
    Social: ['social', 'networking', 'community', 'volunteering'],
};

/** The categories an interest is close to, with the interest as the person wrote it. */
export function categoriesForInterests(interests: string[]): Map<string, string> {
    const matched = new Map<string, string>();
    for (const raw of interests) {
        const interest = raw.trim();
        const l = interest.toLowerCase();
        if (!l) continue;
        for (const [category, words] of Object.entries(CATEGORY_WORDS)) {
            // Whole words only: "art" must not match "startup".
            if (!matched.has(category) && (l === category.toLowerCase() || words.includes(l))) {
                matched.set(category, interest);
            }
        }
    }
    return matched;
}

const EVENT_SELECT = {
    id: true,
    title: true,
    date: true,
    venue: true,
    category: true,
    clubId: true,
    hostCollegeId: true,
    hostCollege: { select: { name: true } },
    club: { select: { name: true } },
} satisfies Prisma.EventSelect;

export type DigestEvent = Prisma.EventGetPayload<{ select: typeof EVENT_SELECT }>;

export interface DigestRecipient {
    id: string;
    name: string;
    email: string;
    collegeId: string | null;
    followedCollegeIds: string[];
    clubIds: string[];
    interests: string[];
}

/*
 * Lower is stronger. An event shows once, under its strongest reason, and the
 * cap keeps the strongest: what you are going to always makes it in.
 */
const Rank = { Going: 0, Saved: 1, Club: 2, College: 3, Followed: 4, Interest: 5 } as const;
type Rank = (typeof Rank)[keyof typeof Rank];

/**
 * One person's week, at most DIGEST_MAX_ITEMS events: what they are going to
 * first, then everything else, each soonest first. Empty means there is
 * nothing to say and no email is sent.
 */
export function buildDigestItems(
    recipient: DigestRecipient,
    going: DigestEvent[],
    saved: DigestEvent[],
    pool: DigestEvent[],
): DigestItem[] {
    const followed = new Set(recipient.followedCollegeIds);
    const clubs = new Set(recipient.clubIds);
    const liked = categoriesForInterests(recipient.interests);
    const likedLower = new Map([...liked].map(([category, interest]) => [category.toLowerCase(), interest]));

    const best = new Map<string, { event: DigestEvent; rank: Rank; reason: string }>();
    const offer = (event: DigestEvent, rank: Rank, reason: string) => {
        const current = best.get(event.id);
        if (!current || rank < current.rank) best.set(event.id, { event, rank, reason });
    };

    for (const event of going) offer(event, Rank.Going, 'You are going');
    for (const event of saved) offer(event, Rank.Saved, 'You saved this');
    for (const event of pool) {
        if (event.clubId && clubs.has(event.clubId)) {
            offer(event, Rank.Club, `From ${event.club?.name ?? 'a club you are in'}`);
        } else if (recipient.collegeId && event.hostCollegeId === recipient.collegeId) {
            offer(event, Rank.College, 'At your college');
        } else if (followed.has(event.hostCollegeId)) {
            offer(event, Rank.Followed, 'At a college you follow');
        } else {
            const interest = likedLower.get(event.category.trim().toLowerCase());
            if (interest) offer(event, Rank.Interest, `${event.category.trim()}, close to your interest in ${interest}`);
        }
    }

    const time = (e: DigestEvent) => new Date(e.date).getTime();
    const kept = [...best.values()]
        .sort((a, b) => a.rank - b.rank || time(a.event) - time(b.event))
        .slice(0, DIGEST_MAX_ITEMS)
        .sort((a, b) => Number(b.rank === Rank.Going) - Number(a.rank === Rank.Going) || time(a.event) - time(b.event));

    return kept.map(({ event, rank, reason }) => ({
        id: event.id,
        title: event.title,
        date: new Date(event.date),
        venue: event.venue,
        college: event.hostCollege.name,
        reason,
        going: rank === Rank.Going,
    }));
}

const baseUrl = () => (process.env.NEXT_PUBLIC_APP_URL || SITE_URL).replace(/\/+$/, '');

export type DigestRunResult =
    | { skipped: string }
    | {
          considered: number;
          claimed: number;
          sent: number;
          empty: number;
          failed: number;
          released: number;
          /** True when another call may find more people to send to. */
          more: boolean;
      };

/** The week's events for a whole batch, in three queries, turned into each person's email. */
async function loadOutbox(recipients: DigestRecipient[], now: Date) {
    const weekEnd = new Date(now.getTime() + WEEK_MS);
    const ids = recipients.map((r) => r.id);
    const inWeek = { verified: true, deletedAt: null, date: { gt: now, lte: weekEnd } } satisfies Prisma.EventWhereInput;
    const collegeIds = new Set<string>();
    const clubIds = new Set<string>();
    const categories = new Set<string>();
    for (const r of recipients) {
        if (r.collegeId) collegeIds.add(r.collegeId);
        r.followedCollegeIds.forEach((id) => collegeIds.add(id));
        r.clubIds.forEach((id) => clubIds.add(id));
        for (const category of categoriesForInterests(r.interests).keys()) {
            // Categories are written in title case by the event forms; the
            // lower-case spelling catches older rows. Compared case-blind later.
            categories.add(category);
            categories.add(category.toLowerCase());
        }
    }
    const poolFilters: Prisma.EventWhereInput[] = [];
    if (collegeIds.size > 0) poolFilters.push({ hostCollegeId: { in: [...collegeIds] } });
    if (clubIds.size > 0) poolFilters.push({ clubId: { in: [...clubIds] } });
    if (categories.size > 0) poolFilters.push({ category: { in: [...categories] } });

    const [registrations, saves, pool] = await Promise.all([
        prisma.eventRegistration.findMany({
            relationLoadStrategy: 'join',
            where: { userId: { in: ids }, status: { in: [...GOING] }, event: inWeek },
            select: { userId: true, event: { select: EVENT_SELECT } },
        }),
        prisma.eventInterest.findMany({
            relationLoadStrategy: 'join',
            where: { userId: { in: ids }, event: inWeek },
            select: { userId: true, event: { select: EVENT_SELECT } },
        }),
        poolFilters.length > 0
            ? prisma.event.findMany({
                  relationLoadStrategy: 'join',
                  where: { ...inWeek, OR: poolFilters },
                  orderBy: { date: 'asc' },
                  take: 1000,
                  select: EVENT_SELECT,
              })
            : Promise.resolve([] as DigestEvent[]),
    ]);

    const byUser = (rows: { userId: string; event: DigestEvent }[]) => {
        const map = new Map<string, DigestEvent[]>();
        for (const row of rows) map.set(row.userId, [...(map.get(row.userId) ?? []), row.event]);
        return map;
    };
    const goingByUser = byUser(registrations);
    const savedByUser = byUser(saves);

    const outbox: { recipient: DigestRecipient; items: DigestItem[] }[] = [];
    let empty = 0;
    for (const recipient of recipients) {
        const items = buildDigestItems(recipient, goingByUser.get(recipient.id) ?? [], savedByUser.get(recipient.id) ?? [], pool);
        if (items.length === 0) empty++;
        else outbox.push({ recipient, items });
    }
    return { outbox, empty };
}

/* Undoes this run's claim on people it did not send to. Matching on the
   claim's own timestamp means a later run's claim is never undone. */
async function release(ids: string[], claimedAt: Date) {
    if (ids.length === 0) return;
    await prisma.user.updateMany({
        where: { id: { in: ids }, digestSentAt: claimedAt },
        data: { digestSentAt: null },
    });
}

/** Sends one batch of the weekly digest. */
export async function runDigestBatch(now = new Date()): Promise<DigestRunResult> {
    // Every email carries a one-click unsubscribe; without the signing key
    // there is no link that works, so nothing is sent at all.
    if (!ticketsEnabled()) return { skipped: 'TICKET_SECRET is not set, so there is no unsubscribe link.' };
    // Checked before claiming, so a missing key does not use up anyone's week.
    if (!emailEnabled()) return { skipped: 'RESEND_API_KEY is not set, so email is off.' };

    const cutoff = new Date(now.getTime() - RESEND_AFTER_MS);

    const candidates = await prisma.user.findMany({
        relationLoadStrategy: 'join',
        where: {
            weeklyDigest: true,
            emailVerified: { not: null },
            deletedAt: null,
            NOT: { email: { equals: DEMO_EMAIL, mode: 'insensitive' } },
            OR: [{ digestSentAt: null }, { digestSentAt: { lt: cutoff } }],
        },
        orderBy: { id: 'asc' },
        take: DIGEST_BATCH_SIZE,
        select: {
            id: true,
            name: true,
            email: true,
            collegeId: true,
            followedColleges: { select: { id: true } },
            clubMemberships: { select: { clubId: true } },
            interests: { select: { name: true } },
        },
    });
    const eligible = candidates.filter((u) => !isDemoEmail(u.email));
    if (eligible.length === 0) {
        return { considered: candidates.length, claimed: 0, sent: 0, empty: 0, failed: 0, released: 0, more: false };
    }

    // The claim. Conditions repeated from the query above, because a person
    // may have opted out, been deleted or been claimed by another run since.
    const claimedRows = await prisma.$queryRaw<{ id: string }[]>`
        UPDATE "User"
        SET "digestSentAt" = ${now}
        WHERE "id" IN (${Prisma.join(eligible.map((u) => u.id))})
          AND "weeklyDigest" = true
          AND "emailVerified" IS NOT NULL
          AND "deletedAt" IS NULL
          AND ("digestSentAt" IS NULL OR "digestSentAt" < ${cutoff})
        RETURNING "id"`;
    const claimedIds = new Set(claimedRows.map((r) => r.id));
    const recipients: DigestRecipient[] = eligible
        .filter((u) => claimedIds.has(u.id))
        .map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            collegeId: u.collegeId,
            followedCollegeIds: u.followedColleges.map((c) => c.id),
            clubIds: u.clubMemberships.map((m) => m.clubId),
            interests: u.interests.map((i) => i.name),
        }));

    const more = candidates.length === DIGEST_BATCH_SIZE;
    if (recipients.length === 0) {
        return { considered: candidates.length, claimed: 0, sent: 0, empty: 0, failed: 0, released: 0, more };
    }

    // Claimed but not yet sent: if reading the week fails, hand everyone
    // back rather than lose their week.
    let loaded: Awaited<ReturnType<typeof loadOutbox>>;
    try {
        loaded = await loadOutbox(recipients, now);
    } catch (error) {
        await release(recipients.map((r) => r.id), now);
        throw error;
    }
    const { outbox, empty } = loaded;
    const base = baseUrl();

    let sent = 0;
    let failed = 0;
    const started = Date.now();
    let next = 0;
    const unsent: string[] = [];

    const worker = async () => {
        while (next < outbox.length) {
            const { recipient, items } = outbox[next++];
            if (Date.now() - started > SEND_BUDGET_MS) {
                unsent.push(recipient.id);
                continue;
            }
            const token = digestUnsubscribeToken(recipient.id);
            if (!token) {
                // Unreachable after the ticketsEnabled check; kept so a key
                // that vanishes mid-run still never sends an email without one.
                unsent.push(recipient.id);
                continue;
            }
            const pageUrl = `${base}/digest/unsubscribe/${encodeURIComponent(token)}`;
            const oneClickUrl = `${base}/api/digest/unsubscribe/${encodeURIComponent(token)}`;
            const { subject, html, text } = renderDigestEmail({ name: recipient.name, items, baseUrl: base, unsubscribeUrl: pageUrl });
            /* RFC 8058 one-click unsubscribe: Gmail and Yahoo show their own
               "Unsubscribe" button from these and POST to the address. They
               reach Resend once src/lib/email.ts forwards `headers`. */
            const message = {
                to: recipient.email,
                subject,
                html,
                text,
                headers: {
                    'List-Unsubscribe': `<${oneClickUrl}>`,
                    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                },
            };
            try {
                const result = await sendEmail(message);
                if (result.success) sent++;
                else failed++;
            } catch {
                failed++;
            }
        }
    };
    await Promise.all(Array.from({ length: Math.min(SEND_CONCURRENCY, outbox.length) }, worker));

    // Out of time: hand these back so the next call picks them up this morning.
    await release(unsent, now);

    const result = {
        considered: candidates.length,
        claimed: recipients.length,
        sent,
        empty,
        failed,
        released: unsent.length,
        more: more || unsent.length > 0,
    };
    logger.info('Weekly digest batch', result);
    return result;
}

/** Turns the digest off for the person a signed unsubscribe link was made for. */
export async function unsubscribeFromDigest(userId: string): Promise<boolean> {
    const { count } = await prisma.user.updateMany({
        where: { id: userId, deletedAt: null },
        data: { weeklyDigest: false },
    });
    return count > 0;
}
