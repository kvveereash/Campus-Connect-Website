import 'server-only';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { GOING } from '@/lib/ticket';
import { istDayKey, istDayKeyDaysAgo, normaliseSource, type Source } from '@/components/analytics/sources';

/*
 * Organiser analytics: page views, registrations and check-ins for an event,
 * and where people came from. Views are stored as a count per event, per
 * Indian day, per source (EventView), never per person: nothing here can say
 * who looked at an event, only how many did and from where.
 */

export {
    SOURCES,
    isSource,
    normaliseSource,
    resolveSource,
    sourceFromReferrer,
    withRef,
    istDayKey,
    istDayKeyDaysAgo,
    type Source,
} from '@/components/analytics/sources';

export const ANALYTICS_DAYS = 30;

/* Crawlers, link previews and scripts. Every real browser sends a user
   agent, so a missing one is treated the same way. WhatsApp's link preview
   fetcher is matched only at the start ("WhatsApp/2..."), so a phone
   browser that mentions WhatsApp somewhere still counts. */
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|^whatsapp\/|headless|lighthouse|pagespeed|curl|wget|python|httpclient|okhttp|axios|node-fetch|undici|go-http|java\/|libwww|postman/i;

export const isBotUserAgent = (userAgent: string | null | undefined) => !userAgent || BOT.test(userAgent);

/* A Prisma @db.Date column takes the date part of the instant it is given,
   read in UTC, so the Indian day goes in as midnight UTC of that date. */
const asDbDate = (key: string) => new Date(`${key}T00:00:00.000Z`);
const fromDbDate = (value: Date) => value.toISOString().slice(0, 10);

/**
 * Adds one view of an event, today (Indian time), from `source`. One
 * statement: the insert reads the event in the same query, so an id that is
 * not a live, approved event inserts nothing, and two views at the same
 * moment both land rather than racing to create the row. Never throws:
 * counting a view must not break anything else.
 */
export async function recordView(eventId: string, source: Source): Promise<boolean> {
    const day = istDayKey();
    try {
        const inserted = await prisma.$executeRaw`
            INSERT INTO "EventView" ("eventId", "day", "source", "count")
            SELECT "id", ${day}::date, ${source}, 1
            FROM "Event"
            WHERE "id" = ${eventId} AND "verified" = true AND "deletedAt" IS NULL
            ON CONFLICT ("eventId", "day", "source")
            DO UPDATE SET "count" = "EventView"."count" + 1
        `;
        return inserted > 0;
    } catch (error) {
        logger.warn('event_view_not_recorded', { eventId, error: error instanceof Error ? error.message : String(error) });
        return false;
    }
}

export type SourceRow = {
    /** 'unknown' is registrations from before sources were recorded. */
    source: Source | 'unknown';
    views: number;
    registrations: number;
};

export type EventAnalytics = {
    totals: { views: number; registrations: number; checkIns: number };
    /** Shares from 0 to 1 (views to registrations can pass 1; see the component). Null when there is nothing to divide by. */
    conversion: { viewToRegistration: number | null; registrationToCheckIn: number | null };
    sources: SourceRow[];
    /** The last ANALYTICS_DAYS Indian days, oldest first, every day present. */
    daily: { day: string; views: number }[];
};

const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : null);

/**
 * Everything the organiser's analytics panel shows, in four aggregate
 * queries run together. Registrations are places that count as going (free
 * sign-ups and paid ones), the same number the attendees page calls Going.
 */
export async function getEventAnalytics(eventId: string): Promise<EventAnalytics> {
    const firstDay = istDayKeyDaysAgo(ANALYTICS_DAYS - 1);
    const going = { eventId, status: { in: [...GOING] } };

    const [viewsBySource, viewsByDay, registrationsBySource, checkIns] = await Promise.all([
        prisma.eventView.groupBy({ by: ['source'], where: { eventId }, _sum: { count: true } }),
        prisma.eventView.groupBy({
            by: ['day'],
            where: { eventId, day: { gte: asDbDate(firstDay) } },
            _sum: { count: true },
        }),
        prisma.eventRegistration.groupBy({ by: ['source'], where: going, _count: { _all: true } }),
        prisma.eventRegistration.count({ where: { ...going, checkedInAt: { not: null } } }),
    ]);

    const rows = new Map<SourceRow['source'], SourceRow>();
    const row = (source: SourceRow['source']) => {
        let found = rows.get(source);
        if (!found) {
            found = { source, views: 0, registrations: 0 };
            rows.set(source, found);
        }
        return found;
    };
    for (const v of viewsBySource) row(normaliseSource(v.source)).views += v._sum.count ?? 0;
    for (const r of registrationsBySource) {
        row(r.source === null ? 'unknown' : normaliseSource(r.source)).registrations += r._count._all;
    }

    const sources = [...rows.values()]
        .filter((r) => r.views > 0 || r.registrations > 0)
        .sort((a, b) => b.views - a.views || b.registrations - a.registrations || a.source.localeCompare(b.source));

    const perDay = new Map(viewsByDay.map((d) => [fromDbDate(d.day), d._sum.count ?? 0]));
    const daily = Array.from({ length: ANALYTICS_DAYS }, (_, i) => {
        const day = istDayKeyDaysAgo(ANALYTICS_DAYS - 1 - i);
        return { day, views: perDay.get(day) ?? 0 };
    });

    const views = sources.reduce((sum, r) => sum + r.views, 0);
    const registrations = sources.reduce((sum, r) => sum + r.registrations, 0);

    return {
        totals: { views, registrations, checkIns },
        conversion: {
            viewToRegistration: ratio(registrations, views),
            registrationToCheckIn: ratio(checkIns, registrations),
        },
        sources,
        daily,
    };
}
