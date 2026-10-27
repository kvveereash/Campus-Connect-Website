import type { Metadata } from 'next';
import { T } from '@/lib/i18n';
import type { MessageKey } from '@/lib/i18n/messages';
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
    description: 'Events you are registered for, roles you are volunteering in, payments to finish, and where you have been.',
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
    const [registrations, saved, organising, volunteering] = await Promise.all([
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
        // Volunteer roles you hold at events still to come.
        prisma.volunteerSignup.findMany({
            where: { userId, role: { event: { deletedAt: null, date: { gte: new Date() } } } },
            orderBy: { role: { event: { date: 'asc' } } },
            take: 20,
            select: { id: true, role: { select: { name: true, event: { select: { id: true, title: true, date: true } } } } },
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

    const section = (label: MessageKey, rows: typeof registrations, note?: MessageKey) =>
        rows.length > 0 && (
            <section>
                <div className={styles.groupHead}>
                    <h2>
                        <T k={label} />
                    </h2>
                    <span className={styles.groupCount}>{rows.length}</span>
                </div>
                {rows.map((r) => (
                    <EventRow key={r.id} event={r.event satisfies RowEvent} note={note && <T k={note} />} />
                ))}
            </section>
        );

    return (
        // No filter rail here, so the sticky group headings sit right under
        // the navbar; the board sets --rail-h on the root for its own rail.
        <div className={styles.screen} style={{ ['--rail-h' as string]: '0px' }}>
            <div className={styles.inner}>
                <header className={styles.masthead}>
                    <p className="mono-label">
                        <T k="mine.eyebrow" />
                    </p>
                    <div className={styles.mastheadRow}>
                        <h1 className={styles.wordmark}>
                            <T k="mine.titleBefore" />
                            <em className="accent">
                                <T k="mine.titleAccent" />
                            </em>
                        </h1>
                        {going.length > 0 && (
                            <span className={styles.count}>
                                <T k="mine.comingUpCount" vars={{ n: going.length }} />
                            </span>
                        )}
                    </div>
                    <p className={styles.strap}>
                        <T k="mine.strap" />
                    </p>
                </header>

                <main>
                    {registrations.length > 0 && <InstallPrompt />}
                    {organising.length > 0 && (
                        <section>
                            <div className={styles.groupHead}>
                                <h2>
                                    <T k="mine.organising" />
                                </h2>
                                <span className={styles.groupCount}>{organising.length}</span>
                            </div>
                            <ul className={mine.certificates}>
                                {organising.map((e) => (
                                    <li key={e.id} className={mine.certificate}>
                                        <span>
                                            <strong>{e.title}</strong>
                                            <small>
                                                {formatIST(e.date, { weekday: 'short', day: 'numeric', month: 'short' })} ·{' '}
                                                {e.capacity ? (
                                                    <T k="mine.goingOf" vars={{ n: e.registrationCount, cap: e.capacity }} />
                                                ) : (
                                                    <T k="mine.goingCount" vars={{ n: e.registrationCount }} />
                                                )}
                                            </small>
                                        </span>
                                        <Link href={`/events/${e.id}/attendees`} className="btn btn-outline">
                                            <T k="event.attendees" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                    {volunteering.length > 0 && (
                        <section>
                            <div className={styles.groupHead}>
                                <h2>
                                    <T k="mine.volunteering" />
                                </h2>
                                <span className={styles.groupCount}>{volunteering.length}</span>
                            </div>
                            <ul className={mine.certificates}>
                                {volunteering.map(({ id, role }) => (
                                    <li key={id} className={mine.certificate}>
                                        <span>
                                            <strong>{role.event.title}</strong>
                                            <small>
                                                <T k="mine.asRole" vars={{ role: role.name }} /> ·{' '}
                                                {formatIST(role.event.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                                            </small>
                                        </span>
                                        <Link href={`/events/${role.event.id}`} className="btn btn-outline">
                                            <T k="mine.openEvent" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                    {registrations.length === 0 && saved.length === 0 ? (
                        <div className={styles.empty}>
                            <p className={styles.emptyTitle}>
                                <T k="mine.nothingYet" />
                            </p>
                            <p>
                                <T k="mine.nothingYetBody" />
                            </p>
                            <Link href="/events" className="btn btn-primary">
                                <T k="notif.browse" />
                            </Link>
                        </div>
                    ) : (
                        <>
                            {section('mine.finishPaying', toPay, 'mine.paymentPending')}
                            {section('mine.comingUp', going)}
                            {section('mine.waitlist', waitlisted, 'register.waitlisted')}
                            {saved.length > 0 && (
                                <section>
                                    <div className={styles.groupHead}>
                                        <h2>
                                            <T k="mine.saved" />
                                        </h2>
                                        <span className={styles.groupCount}>{saved.length}</span>
                                    </div>
                                    {saved.map((s) => (
                                        <EventRow key={s.id} event={s.event} note={<T k="interest.saved" />} />
                                    ))}
                                </section>
                            )}
                            {upcoming.length === 0 && (
                                <div className={styles.empty}>
                                    <p className={styles.emptyTitle}>
                                        <T k="mine.nothingComing" />
                                    </p>
                                    <p>
                                        <T k="mine.nothingComingBody" />
                                    </p>
                                    <Link href="/events" className="btn btn-primary">
                                        <T k="notif.browse" />
                                    </Link>
                                </div>
                            )}
                            {section('mine.beenTo', past)}
                            {certificates.length > 0 && (
                                <section>
                                    <div className={styles.groupHead}>
                                        <h2>
                                            <T k="mine.certificates" />
                                        </h2>
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
                                                    <T k="mine.download" />
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
                            <h2 id="calendar-feed">
                                <T k="mine.feedTitle" />
                            </h2>
                            <p>
                                <T k="mine.feedBody" />
                            </p>
                            <div className={mine.feedActions}>
                                <a
                                    href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-primary"
                                >
                                    <T k="mine.addGoogle" />
                                </a>
                                <a href={webcalUrl} className="btn btn-outline">
                                    <T k="mine.appleOutlook" />
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
