import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { formatIST } from '@/lib/format';
import { istDayKey, istDayKeyDaysAgo } from '@/lib/analytics';
import { inkFor } from '@/app/events/press';
import styles from './insights.module.css';

export const metadata: Metadata = { title: 'Insights', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const WEEKS = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

const number = new Intl.NumberFormat('en-IN');

/* Weeks run Monday to Sunday on Indian time, matching date_trunc('week')
   on the IST timestamp in the queries below. */
function weekStarts(now = Date.now()) {
    const weekday = new Date(`${istDayKey(now)}T00:00:00Z`).getUTCDay(); // 0 is Sunday
    const sinceMonday = (weekday + 6) % 7;
    return Array.from({ length: WEEKS }, (_, i) => istDayKeyDaysAgo(sinceMonday + 7 * (WEEKS - 1 - i), now));
}

const startOfIstDay = (key: string) => new Date(`${key}T00:00:00+05:30`);
const dateKey = (value: Date) => value.toISOString().slice(0, 10);

/** "3 h", "2 days": how long something took, to the unit that reads naturally. */
function duration(seconds: number | null) {
    if (seconds === null || !Number.isFinite(seconds)) return '–';
    const minutes = seconds / 60;
    if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
    const hours = minutes / 60;
    if (hours < 48) return `${Math.round(hours)} h`;
    return `${Math.round(hours / 24)} days`;
}

type Weekly = { week: Date; count: number }[];

/*
 * Every number is aggregated in the database (date_trunc, COUNT, the median
 * with percentile_cont), never by loading rows, and the reads run together.
 */
async function loadInsights() {
    const now = new Date();
    const weeks = weekStarts(now.getTime());
    const since = startOfIstDay(weeks[0]);
    const in30Days = new Date(now.getTime() + 30 * DAY_MS);
    const ago30Days = new Date(now.getTime() - 30 * DAY_MS);
    const ago90Days = new Date(now.getTime() - 90 * DAY_MS);

    const [signups, published, collegeTotals, activeColleges, categories, openReports, resolution] = await Promise.all([
        prisma.$queryRaw<Weekly>`
            SELECT date_trunc('week', ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')::date AS week,
                   COUNT(*)::int AS count
            FROM "User"
            WHERE "createdAt" >= ${since}
            GROUP BY 1
        `,
        prisma.$queryRaw<Weekly>`
            SELECT date_trunc('week', ("verifiedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')::date AS week,
                   COUNT(*)::int AS count
            FROM "Event"
            WHERE "verified" = true AND "deletedAt" IS NULL AND "verifiedAt" >= ${since}
            GROUP BY 1
        `,
        prisma.$queryRaw<{ total: number; withEvents: number; withStudents: number }[]>`
            SELECT
                (SELECT COUNT(*)::int FROM "College") AS "total",
                (SELECT COUNT(DISTINCT "hostCollegeId")::int FROM "Event"
                    WHERE "verified" = true AND "deletedAt" IS NULL AND "date" >= ${now} AND "date" < ${in30Days}) AS "withEvents",
                (SELECT COUNT(DISTINCT "collegeId")::int FROM "User"
                    WHERE "collegeId" IS NOT NULL AND "deletedAt" IS NULL AND "lastSeenAt" >= ${ago30Days}) AS "withStudents"
        `,
        prisma.$queryRaw<{ id: string; name: string; students: number; events: number }[]>`
            WITH active AS (
                SELECT "collegeId" AS id, COUNT(*)::int AS students FROM "User"
                WHERE "collegeId" IS NOT NULL AND "deletedAt" IS NULL AND "lastSeenAt" >= ${ago30Days}
                GROUP BY 1
            ), upcoming AS (
                SELECT "hostCollegeId" AS id, COUNT(*)::int AS events FROM "Event"
                WHERE "verified" = true AND "deletedAt" IS NULL AND "date" >= ${now} AND "date" < ${in30Days}
                GROUP BY 1
            )
            SELECT c."id", c."name", COALESCE(a.students, 0) AS "students", COALESCE(u.events, 0) AS "events"
            FROM "College" c
            LEFT JOIN active a ON a.id = c."id"
            LEFT JOIN upcoming u ON u.id = c."id"
            WHERE a.id IS NOT NULL OR u.id IS NOT NULL
            ORDER BY "students" DESC, "events" DESC, c."name"
            LIMIT 10
        `,
        prisma.$queryRaw<{ category: string; registrations: number }[]>`
            SELECT e."category", COUNT(*)::int AS "registrations"
            FROM "EventRegistration" r
            JOIN "Event" e ON e."id" = r."eventId"
            WHERE r."createdAt" >= ${ago90Days} AND r."status" IN ('PAID', 'COMPLETED') AND e."deletedAt" IS NULL
            GROUP BY 1
            ORDER BY 2 DESC
            LIMIT 8
        `,
        prisma.report.aggregate({ where: { status: 'OPEN' }, _count: { _all: true }, _min: { createdAt: true } }),
        prisma.$queryRaw<{ medianSeconds: number | null; resolved: number }[]>`
            SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")))::float8 AS "medianSeconds",
                   COUNT(*)::int AS "resolved"
            FROM "Report"
            WHERE "resolvedAt" IS NOT NULL AND "resolvedAt" >= ${ago90Days}
        `,
    ]);

    const byWeek = (rows: Weekly) => {
        const counts = new Map(rows.map((r) => [dateKey(r.week), r.count]));
        return weeks.map((week) => counts.get(week) ?? 0);
    };

    return {
        weeks,
        signups: byWeek(signups),
        published: byWeek(published),
        colleges: collegeTotals[0] ?? { total: 0, withEvents: 0, withStudents: 0 },
        activeColleges,
        categories,
        moderation: {
            open: openReports._count._all,
            oldestOpenSeconds: openReports._min.createdAt ? (now.getTime() - openReports._min.createdAt.getTime()) / 1000 : null,
            medianSeconds: resolution[0]?.medianSeconds ?? null,
            resolved: resolution[0]?.resolved ?? 0,
        },
    };
}

export default async function InsightsPage() {
    // A layout and its page render in parallel, so the page checks for itself.
    const session = await getSession();
    if (session?.user?.role !== 'ADMIN') redirect('/');

    const { weeks, signups, published, colleges, activeColleges, categories, moderation } = await loadInsights();

    const signupTotal = signups.reduce((a, b) => a + b, 0);
    const publishedTotal = published.reduce((a, b) => a + b, 0);
    const signupPeak = Math.max(1, ...signups);
    const publishedPeak = Math.max(1, ...published);
    const categoryPeak = Math.max(1, ...categories.map((c) => c.registrations));

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>
                    Is the board <span className="accent">working</span>
                </h1>
                <p className={styles.lede}>
                    Weeks run Monday to Sunday, Indian time. Every figure is a count; nothing on this page names a person.
                </p>
            </header>

            <dl className={styles.stats}>
                <div className={styles.stat}>
                    <dt>Sign-ups, {WEEKS} weeks</dt>
                    <dd>{number.format(signupTotal)}</dd>
                </div>
                <div className={styles.stat}>
                    <dt>Events published, {WEEKS} weeks</dt>
                    <dd>{number.format(publishedTotal)}</dd>
                </div>
                <div className={styles.stat}>
                    <dt>Colleges with events, next 30 days</dt>
                    <dd>
                        {number.format(colleges.withEvents)}
                        <small>of {number.format(colleges.total)}</small>
                    </dd>
                </div>
                <div className={styles.stat}>
                    <dt>Colleges with active students, 30 days</dt>
                    <dd>
                        {number.format(colleges.withStudents)}
                        <small>of {number.format(colleges.total)}</small>
                    </dd>
                </div>
            </dl>

            <section className={styles.section} aria-labelledby="insights-weekly">
                <h2 id="insights-weekly" className={styles.label}>
                    Week by week
                </h2>
                <div className={styles.card}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th scope="col">Week of</th>
                                <th scope="col">Sign-ups</th>
                                <th scope="col">Events published</th>
                            </tr>
                        </thead>
                        <tbody>
                            {weeks.map((week, i) => (
                                <tr key={week}>
                                    <th scope="row" className={styles.week}>
                                        {formatIST(startOfIstDay(week), { day: 'numeric', month: 'short' })}
                                    </th>
                                    <td>
                                        <Bar value={signups[i]} peak={signupPeak} />
                                    </td>
                                    <td>
                                        <Bar value={published[i]} peak={publishedPeak} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className={styles.section} aria-labelledby="insights-colleges">
                <h2 id="insights-colleges" className={styles.label}>
                    Active colleges
                </h2>
                {activeColleges.length === 0 ? (
                    <div className={styles.empty}>
                        <h3 className={styles.emptyTitle}>No college is active right now</h3>
                        <p className={styles.emptyText}>
                            No approved events in the next 30 days and no students seen in the last 30.
                        </p>
                        <Link href="/admin/verification" className={styles.emptyLink}>
                            Review events waiting for approval
                        </Link>
                    </div>
                ) : (
                    <div className={styles.card}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th scope="col">College</th>
                                    <th scope="col" className={styles.num}>
                                        Students seen, 30 days
                                    </th>
                                    <th scope="col" className={styles.num}>
                                        Events, next 30 days
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeColleges.map((college) => (
                                    <tr key={college.id}>
                                        <th scope="row">
                                            <Link href={`/colleges/${college.id}`} className={styles.rowLink}>
                                                {college.name}
                                            </Link>
                                        </th>
                                        <td className={styles.num}>{number.format(college.students)}</td>
                                        <td className={styles.num}>{number.format(college.events)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className={styles.section} aria-labelledby="insights-categories">
                <h2 id="insights-categories" className={styles.label}>
                    Busiest categories, by registrations in the last 90 days
                </h2>
                {categories.length === 0 ? (
                    <div className={styles.empty}>
                        <h3 className={styles.emptyTitle}>No registrations in 90 days</h3>
                        <p className={styles.emptyText}>Categories rank here once students start signing up for events.</p>
                        <Link href="/events" className={styles.emptyLink}>
                            Open the board
                        </Link>
                    </div>
                ) : (
                    <ul className={styles.categories}>
                        {categories.map((c) => (
                            <li key={c.category} className={styles.category}>
                                <span className={styles.categoryName}>
                                    <span className={styles.square} style={{ '--mark': inkFor(c.category) } as CSSProperties} aria-hidden="true" />
                                    {c.category}
                                </span>
                                <Bar value={c.registrations} peak={categoryPeak} />
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className={styles.section} aria-labelledby="insights-moderation">
                <h2 id="insights-moderation" className={styles.label}>
                    Moderation
                </h2>
                <dl className={styles.stats}>
                    <div className={styles.stat}>
                        <dt>Open reports</dt>
                        <dd>
                            <span className={moderation.open > 0 ? styles.marked : undefined}>{number.format(moderation.open)}</span>
                        </dd>
                    </div>
                    <div className={styles.stat}>
                        <dt>Oldest open report</dt>
                        <dd>{duration(moderation.oldestOpenSeconds)}</dd>
                    </div>
                    <div className={styles.stat}>
                        <dt>Median time to resolve, 90 days</dt>
                        <dd>
                            {duration(moderation.medianSeconds)}
                            <small>{number.format(moderation.resolved)} resolved</small>
                        </dd>
                    </div>
                </dl>
                {moderation.open > 0 && (
                    <p className={styles.more}>
                        <Link href="/admin/reports" className={styles.rowLink}>
                            Work through the open reports
                        </Link>
                    </p>
                )}
            </section>
        </div>
    );
}

function Bar({ value, peak }: { value: number; peak: number }) {
    return (
        <span className={styles.barCell}>
            <span className={styles.track} aria-hidden="true">
                <span className={styles.bar} data-empty={value === 0} style={{ width: `${(value / peak) * 100}%` }} />
            </span>
            <span className={styles.barValue}>{number.format(value)}</span>
        </span>
    );
}
