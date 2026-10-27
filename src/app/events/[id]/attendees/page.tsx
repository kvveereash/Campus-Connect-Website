import { Suspense, type CSSProperties } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canManageEvent, GOING } from '@/lib/ticket';
import { checkInFromList } from '@/lib/actions/check-in';
import AnnounceForm from './AnnounceForm';
import Skeleton from '@/components/Skeleton';
import EventAnalytics from '@/components/analytics/EventAnalytics';
import VolunteerManager from '@/components/volunteers/VolunteerManager';
import { getVolunteerRolesForOrganiser } from '@/lib/actions/volunteers';
import OrganiserButton from './OrganiserButton';
import { formatIST } from '@/lib/format';
import styles from '../organiser.module.css';

export const metadata: Metadata = { title: 'Attendees', robots: { index: false, follow: false } };

const DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD of the Indian calendar day an instant falls on. */
const istDay = (date: Date | number) => formatIST(date, { year: 'numeric', month: '2-digit', day: '2-digit' });

/** Sign-ups on each of the last DAYS Indian days, oldest first. */
function signupsByDay(registrations: { createdAt: Date }[]) {
    const now = Date.now();
    const days = Array.from({ length: DAYS }, (_, i) => istDay(now - (DAYS - 1 - i) * DAY_MS));
    const perDay = new Map(days.map((d) => [d, 0]));
    for (const r of registrations) {
        const d = istDay(r.createdAt);
        if (perDay.has(d)) perDay.set(d, (perDay.get(d) ?? 0) + 1);
    }
    return { days, counts: days.map((d) => perDay.get(d) ?? 0), firstDay: now - (DAYS - 1) * DAY_MS };
}

/*
 * The organiser's view of who is coming: how many, how many have arrived,
 * when people signed up, and the list itself with a check-in button for
 * anyone whose phone will not scan.
 */
export default async function AttendeesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getSession();
    if (!session?.userId) redirect(`/login?redirect=${encodeURIComponent(`/events/${id}/attendees`)}`);

    const event = await prisma.event.findFirst({
        where: { id, deletedAt: null },
        select: { id: true, title: true, date: true, creatorId: true, clubId: true, creator: { select: { name: true } } },
    });
    if (!event) notFound();
    if (!(await canManageEvent(event, session))) redirect(`/events/${id}`);
    // Only the creator (or a site admin) adds and removes co-organisers.
    const isCreator = event.creatorId === session.userId || session.user?.role === 'ADMIN';

    const [registrations, awaitingPayment, waitlisted, organisers, volunteerRoles] = await Promise.all([
        prisma.eventRegistration.findMany({
            where: { eventId: event.id, status: { in: [...GOING] } },
            orderBy: { createdAt: 'desc' },
            take: 1000,
            select: {
                id: true,
                createdAt: true,
                checkedInAt: true,
                user: { select: { id: true, name: true, avatar: true, college: { select: { name: true } } } },
            },
        }),
        prisma.eventRegistration.count({ where: { eventId: event.id, status: 'PENDING_PAYMENT' } }),
        prisma.eventRegistration.count({ where: { eventId: event.id, status: 'WAITLISTED' } }),
        prisma.eventOrganiser.findMany({
            where: { eventId: event.id },
            orderBy: { createdAt: 'asc' },
            select: { user: { select: { id: true, name: true } } },
        }),
        getVolunteerRolesForOrganiser(event.id),
    ]);
    const organiserIds = new Set(organisers.map((o) => o.user.id));

    const arrived = registrations.filter((r) => r.checkedInAt).length;
    const share = registrations.length ? Math.round((arrived / registrations.length) * 100) : 0;

    const { days, counts, firstDay } = signupsByDay(registrations);
    const peak = Math.max(1, ...counts);
    const recent = counts.reduce((a, b) => a + b, 0);

    return (
        <div className={styles.page}>
            <Link href={`/events/${event.id}`} className={styles.back}>
                <ArrowLeft size={13} aria-hidden="true" />
                Back to the event
            </Link>

            <p className={styles.label}>
                Attendees · {formatIST(event.date, { weekday: 'short', day: 'numeric', month: 'short' })}
            </p>
            <h1 className={styles.title}>{event.title}</h1>
            <p className={styles.lede}>
                Scan tickets at the entrance with your phone camera, or check people in from the list below.
            </p>
            <p className={styles.tools}>
                <Link href={`/events/${event.id}/check-in`} className={styles.link}>
                    Open the door page
                </Link>
                {/* A file download, so a plain link rather than <Link>. */}
                <a href={`/events/${event.id}/attendees.csv`} className={styles.link} download>
                    Download the list (CSV)
                </a>
            </p>

            <dl className={styles.stats}>
                <div className={styles.stat}>
                    <dt>
                        <span className={styles.square} style={{ '--mark': 'var(--press-technology)' } as CSSProperties} />
                        Going
                    </dt>
                    <dd>{registrations.length}</dd>
                </div>
                <div className={styles.stat}>
                    <dt>
                        <span className={styles.square} style={{ '--mark': 'var(--press-sports)' } as CSSProperties} />
                        Checked in
                    </dt>
                    <dd>
                        {arrived}
                        <small>{share}%</small>
                    </dd>
                </div>
                <div className={styles.stat}>
                    <dt>
                        <span className={styles.square} style={{ '--mark': 'var(--press-workshop)' } as CSSProperties} />
                        Awaiting payment
                    </dt>
                    <dd>{awaitingPayment}</dd>
                </div>
                <div className={styles.stat}>
                    <dt>
                        <span className={styles.square} style={{ '--mark': 'var(--press-hackathon)' } as CSSProperties} />
                        Waitlist
                    </dt>
                    <dd>{waitlisted}</dd>
                </div>
            </dl>

            <figure className={styles.chart} aria-label={`${recent} sign-ups in the last ${DAYS} days`}>
                <figcaption className={styles.chartHead}>
                    <span>Sign-ups, last {DAYS} days</span>
                    <span>{recent}</span>
                </figcaption>
                <div className={styles.bars} aria-hidden="true">
                    {counts.map((count, i) => (
                        <span
                            key={days[i]}
                            className={styles.bar}
                            data-empty={count === 0}
                            style={{ height: `${(count / peak) * 100}%` }}
                            title={`${count} on ${days[i]}`}
                        />
                    ))}
                </div>
                <div className={styles.axis} aria-hidden="true">
                    <span>{formatIST(firstDay, { day: 'numeric', month: 'short' })}</span>
                    <span>Today</span>
                </div>
            </figure>

            {/* Streams in after the list: its own queries should not hold up the door. */}
            <Suspense fallback={<Skeleton height="420px" borderRadius="var(--radius-card)" style={{ marginTop: 44 }} />}>
                <EventAnalytics eventId={event.id} />
            </Suspense>

            <p className={styles.label}>Post an update</p>
            <AnnounceForm eventId={event.id} audience={registrations.length + waitlisted} />

            <p className={styles.label}>Organisers</p>
            <ul className={styles.organisers}>
                <li className={styles.organiser}>
                    <span>
                        {event.creator?.name ?? 'The creator'}
                        <small>Created it</small>
                    </span>
                </li>
                {organisers.map(({ user }) => (
                    <li key={user.id} className={styles.organiser}>
                        <span>
                            {user.name}
                            <small>Co-organiser</small>
                        </span>
                        {isCreator && <OrganiserButton eventId={event.id} userId={user.id} name={user.name} mode="remove" />}
                    </li>
                ))}
            </ul>
            {isCreator && organisers.length === 0 && (
                <p className={styles.lede}>Need help at the door? Pick someone going and choose Make organiser next to their name.</p>
            )}

            <p className={styles.label}>Volunteers</p>
            <VolunteerManager eventId={event.id} roles={volunteerRoles} />

            <p className={styles.label}>Who is coming</p>
            {registrations.length === 0 ? (
                <div className={styles.empty}>
                    <h2>No one yet.</h2>
                    <p>People who register, or pay for a paid event, show up here as they do.</p>
                    <Link href={`/events/${event.id}`} className="btn btn-outline">
                        Share the event page
                    </Link>
                </div>
            ) : (
                <ul className={styles.list}>
                    {registrations.map((r) => (
                        <li key={r.id} className={styles.row}>
                            <span className={styles.avatar}>
                                {r.user.avatar ? (
                                    <Image src={r.user.avatar} alt="" width={40} height={40} />
                                ) : (
                                    r.user.name.charAt(0).toUpperCase()
                                )}
                            </span>
                            <span className={styles.who}>
                                <Link href={`/profile/${r.user.id}`} className={styles.name}>
                                    {r.user.name}
                                </Link>
                                <span className={styles.meta}>
                                    {[r.user.college?.name, `signed up ${formatIST(r.createdAt, { day: 'numeric', month: 'short' })}`]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </span>
                                {isCreator && r.user.id !== event.creatorId && !organiserIds.has(r.user.id) && (
                                    <OrganiserButton eventId={event.id} userId={r.user.id} name={r.user.name} mode="add" />
                                )}
                            </span>
                            {r.checkedInAt ? (
                                <span className={styles.arrived}>
                                    In at {formatIST(r.checkedInAt, { hour: 'numeric', minute: '2-digit' })}
                                </span>
                            ) : (
                                <form action={checkInFromList.bind(null, event.id, r.id)}>
                                    <button type="submit" className="btn btn-outline">
                                        Check in
                                    </button>
                                </form>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
