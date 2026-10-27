import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import EventRow, { ROW_EVENT_SELECT, type RowEvent } from '@/app/events/EventRow';
import InstallPrompt from '@/components/InstallPrompt';
import CopyLink from '@/components/CopyLink';
import { calendarFeedToken } from '@/lib/ticket';
import { formatIST } from '@/lib/format';
import { SITE_URL } from '@/lib/site';
import styles from '@/app/events/press.module.css';
import mine from './page.module.css';

export const metadata: Metadata = {
    title: 'My events',
    description: 'Events you are registered for, payments to finish, and where you have been.',
};

/*
 * Everything you have signed up for, in one place. It used to live only in a
 * tab on your profile, so after registering there was no obvious way back to
 * a ticket. Per person, so rendered per request; the middleware has already
 * sent anyone signed out to log in.
 */
export default async function MyEventsPage() {
    const session = await getSession();
    if (!session?.userId) redirect('/login?redirect=%2Fmy-events');

    const userId = session.userId as string;
    const [registrations, saved, organising] = await Promise.all([
        prisma.eventRegistration.findMany({
            where: {
                userId,
                status: { in: ['PAID', 'COMPLETED', 'PENDING_PAYMENT', 'WAITLISTED'] },
                event: { deletedAt: null },
            },
            select: { id: true, status: true, checkedInAt: true, event: { select: ROW_EVENT_SELECT } },
            orderBy: { event: { date: 'asc' } },
        }),
        // Saved ("Interested") and not registered for, still to come.
        prisma.eventInterest.findMany({
            where: {
                userId,
                event: {
                    verified: true,
                    deletedAt: null,
                    date: { gte: new Date() },
                    registrations: { none: { userId } },
                },
            },
            select: { id: true, event: { select: ROW_EVENT_SELECT } },
            orderBy: { event: { date: 'asc' } },
        }),
        // Events you run, as their creator or a co-organiser, still to come.
        prisma.event.findMany({
            where: {
                deletedAt: null,
                date: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                OR: [{ creatorId: userId }, { organisers: { some: { userId } } }],
            },
            orderBy: { date: 'asc' },
            take: 20,
            select: { id: true, title: true, date: true, registrationCount: true, capacity: true },
        }),
    ]);

    const now = new Date();
    const upcoming = registrations.filter((r) => r.event.date >= now);
    const toPay = upcoming.filter((r) => r.status === 'PENDING_PAYMENT');
    const waitlisted = upcoming.filter((r) => r.status === 'WAITLISTED');
    const going = upcoming.filter((r) => r.status === 'PAID' || r.status === 'COMPLETED');
    // Unpaid or waitlisted places for past events are not places; most recent first.
    const past = registrations
        .filter((r) => r.event.date < now && (r.status === 'PAID' || r.status === 'COMPLETED'))
        .reverse();
    // Attending, not registering, earns a certificate.
    const certificates = registrations.filter((r) => r.checkedInAt).reverse();

    const feedToken = calendarFeedToken(userId);
    const feedUrl = feedToken ? `${process.env.NEXT_PUBLIC_APP_URL || SITE_URL}/api/calendar/${feedToken}.ics` : null;
    const webcalUrl = feedUrl?.replace(/^https?:/, 'webcal:');

    const section = (label: string, rows: typeof registrations, note?: string) =>
        rows.length > 0 && (
            <section>
                <div className={styles.groupHead}>
                    <h2>{label}</h2>
                    <span className={styles.groupCount}>{rows.length}</span>
                </div>
                {rows.map((r) => (
                    <EventRow key={r.id} event={r.event satisfies RowEvent} note={note} />
                ))}
            </section>
        );

    return (
        // No filter rail here, so the sticky group headings sit right under
        // the navbar; the board sets --rail-h on the root for its own rail.
        <div className={styles.screen} style={{ ['--rail-h' as string]: '0px' }}>
            <div className={styles.inner}>
                <header className={styles.masthead}>
                    <p className="mono-label">My events</p>
                    <div className={styles.mastheadRow}>
                        <h1 className={styles.wordmark}>
                            Where you&rsquo;re <em className="accent">going</em>
                        </h1>
                        {going.length > 0 && <span className={styles.count}>{going.length} coming up</span>}
                    </div>
                    <p className={styles.strap}>
                        Open an event for your ticket, its QR code and a calendar reminder.
                    </p>
                </header>

                <main>
                    {registrations.length > 0 && <InstallPrompt />}
                    {organising.length > 0 && (
                        <section>
                            <div className={styles.groupHead}>
                                <h2>Organising</h2>
                                <span className={styles.groupCount}>{organising.length}</span>
                            </div>
                            <ul className={mine.certificates}>
                                {organising.map((e) => (
                                    <li key={e.id} className={mine.certificate}>
                                        <span>
                                            <strong>{e.title}</strong>
                                            <small>
                                                {formatIST(e.date, { weekday: 'short', day: 'numeric', month: 'short' })} ·{' '}
                                                {e.capacity ? `${e.registrationCount} of ${e.capacity} going` : `${e.registrationCount} going`}
                                            </small>
                                        </span>
                                        <Link href={`/events/${e.id}/attendees`} className="btn btn-outline">
                                            Attendees
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                    {registrations.length === 0 && saved.length === 0 ? (
                        <div className={styles.empty}>
                            <p className={styles.emptyTitle}>Nothing yet</p>
                            <p>Events you register for show up here, with your ticket.</p>
                            <Link href="/events" className="btn btn-primary">
                                Browse events
                            </Link>
                        </div>
                    ) : (
                        <>
                            {section('Finish paying', toPay, 'Payment pending')}
                            {section('Coming up', going)}
                            {section('Waitlist', waitlisted, 'On the waitlist')}
                            {saved.length > 0 && (
                                <section>
                                    <div className={styles.groupHead}>
                                        <h2>Saved</h2>
                                        <span className={styles.groupCount}>{saved.length}</span>
                                    </div>
                                    {saved.map((s) => (
                                        <EventRow key={s.id} event={s.event} note="Saved" />
                                    ))}
                                </section>
                            )}
                            {upcoming.length === 0 && (
                                <div className={styles.empty}>
                                    <p className={styles.emptyTitle}>Nothing coming up</p>
                                    <p>Your next event will show up here once you register.</p>
                                    <Link href="/events" className="btn btn-primary">
                                        Browse events
                                    </Link>
                                </div>
                            )}
                            {section('Been to', past)}
                            {certificates.length > 0 && (
                                <section>
                                    <div className={styles.groupHead}>
                                        <h2>Certificates</h2>
                                        <span className={styles.groupCount}>{certificates.length}</span>
                                    </div>
                                    <ul className={mine.certificates}>
                                        {certificates.map((r) => (
                                            <li key={r.id} className={mine.certificate}>
                                                <span>
                                                    <strong>{r.event.title}</strong>
                                                    <small>
                                                        {formatIST(r.event.date, { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </small>
                                                </span>
                                                <a href={`/events/${r.event.id}/certificate`} className="btn btn-outline">
                                                    Download
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}
                        </>
                    )}

                    {feedUrl && webcalUrl && (
                        <section className={mine.feed} aria-labelledby="calendar-feed">
                            <h2 id="calendar-feed">Your events in your calendar</h2>
                            <p>
                                Subscribe once and every event you register for appears in Google Calendar, Apple Calendar or
                                Outlook, and stays up to date. The link is private to you.
                            </p>
                            <div className={mine.feedActions}>
                                <a
                                    href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-primary"
                                >
                                    Add to Google Calendar
                                </a>
                                <a href={webcalUrl} className="btn btn-outline">
                                    Apple or Outlook
                                </a>
                                <CopyLink value={feedUrl} className={mine.copy} />
                            </div>
                        </section>
                    )}
                </main>
            </div>
        </div>
    );
}
