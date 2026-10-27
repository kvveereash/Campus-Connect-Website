import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ANALYTICS_DAYS, getEventAnalytics, type SourceRow } from '@/lib/analytics';
import { formatIST } from '@/lib/format';
import styles from './EventAnalytics.module.css';

/*
 * The organiser's view of how people find an event: page views, then
 * registrations, then check-ins, where the views came from, and views per
 * day. Counts only; see src/lib/analytics.ts.
 */

const LABELS: Record<SourceRow['source'], string> = {
    board: 'Campus Connect',
    fest: 'Fest timetable',
    whatsapp: 'WhatsApp',
    share: 'Shared link',
    calendar: 'Calendar',
    embed: 'Embedded widget',
    digest: 'Weekly digest',
    search: 'Search',
    direct: 'Direct or typed in',
    other: 'Other sites',
    unknown: 'Before sources were recorded',
};

const number = new Intl.NumberFormat('en-IN');
const percent = (share: number | null) => (share === null ? '–' : `${Math.round(share * 100)}%`);

/** Noon IST on that Indian day, so formatting it can never slip to a neighbouring day. */
const dayDate = (key: string) => new Date(`${key}T12:00:00+05:30`);

export default async function EventAnalytics({ eventId }: { eventId: string }) {
    const { totals, conversion, sources, daily } = await getEventAnalytics(eventId);
    const titleId = `analytics-${eventId}`;

    return (
        <section className={styles.panel} aria-labelledby={titleId}>
            <h2 id={titleId} className={styles.label}>
                How people find it
            </h2>
            <p className={styles.note}>
                Counts only: no one is tracked individually, so this shows how many people looked and where they came from, never who.
            </p>

            {totals.views === 0 ? (
                <div className={styles.empty}>
                    <h3>No views counted yet</h3>
                    <p>Views appear here from the first time someone opens the event page.</p>
                    <Link href={`/events/${eventId}`} className="btn btn-outline">
                        Share the event page
                    </Link>
                </div>
            ) : (
                <>
                    <ol className={styles.funnel}>
                        <li className={styles.step}>
                            <span className={styles.stepLabel}>Page views</span>
                            <span className={styles.stepValue}>{number.format(totals.views)}</span>
                        </li>
                        <li className={styles.rate}>
                            <ArrowRight size={16} aria-hidden="true" className={styles.arrow} />
                            <span className={styles.rateValue}>{percent(conversion.viewToRegistration)}</span>
                            <span className={styles.rateLabel}>registered</span>
                        </li>
                        <li className={styles.step}>
                            <span className={styles.stepLabel}>Registrations</span>
                            <span className={styles.stepValue}>{number.format(totals.registrations)}</span>
                        </li>
                        <li className={styles.rate}>
                            <ArrowRight size={16} aria-hidden="true" className={styles.arrow} />
                            <span className={styles.rateValue}>{percent(conversion.registrationToCheckIn)}</span>
                            <span className={styles.rateLabel}>checked in</span>
                        </li>
                        <li className={styles.step}>
                            <span className={styles.stepLabel}>Check-ins</span>
                            <span className={styles.stepValue}>{number.format(totals.checkIns)}</span>
                        </li>
                    </ol>

                    <DailyViews daily={daily} />

                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <caption className={styles.caption}>Where people came from</caption>
                            <thead>
                                <tr>
                                    <th scope="col">Source</th>
                                    <th scope="col" className={styles.num}>
                                        Views
                                    </th>
                                    <th scope="col" className={styles.num}>
                                        Registrations
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sources.map((row) => (
                                    <tr key={row.source}>
                                        <th scope="row">{LABELS[row.source]}</th>
                                        <td className={styles.num}>{number.format(row.views)}</td>
                                        <td className={styles.num}>{number.format(row.registrations)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </section>
    );
}

function DailyViews({ daily }: { daily: { day: string; views: number }[] }) {
    const peak = Math.max(1, ...daily.map((d) => d.views));
    const recent = daily.reduce((sum, d) => sum + d.views, 0);
    const first = daily[0]?.day;

    return (
        <figure className={styles.chart} aria-label={`${recent} page views in the last ${ANALYTICS_DAYS} days`}>
            <figcaption className={styles.chartHead}>
                <span>Page views, last {ANALYTICS_DAYS} days</span>
                <span className={styles.num}>{number.format(recent)}</span>
            </figcaption>
            <div className={styles.bars} aria-hidden="true">
                {daily.map(({ day, views }) => (
                    <span
                        key={day}
                        className={styles.bar}
                        data-empty={views === 0}
                        style={{ height: `${(views / peak) * 100}%` }}
                        title={`${views} on ${formatIST(dayDate(day), { day: 'numeric', month: 'short' })}`}
                    />
                ))}
            </div>
            <div className={styles.axis} aria-hidden="true">
                <span>{first ? formatIST(dayDate(first), { day: 'numeric', month: 'short' }) : ''}</span>
                <span>Today</span>
            </div>
        </figure>
    );
}
