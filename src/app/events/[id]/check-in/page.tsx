import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canManageEvent, GOING, readTicketToken } from '@/lib/ticket';
import { checkInWithTicket } from '@/lib/actions/check-in';
import { formatIST } from '@/lib/format';
import styles from '../organiser.module.css';

export const metadata: Metadata = { title: 'Check in', robots: { index: false, follow: false } };

/*
 * What an organiser's phone opens when its camera reads a ticket. It shows who
 * the ticket belongs to and asks for one tap to let them in, rather than
 * checking in on load: a link preview or a curious attendee opening their
 * own QR would otherwise mark them as arrived.
 */
export default async function CheckInPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ t?: string }>;
}) {
    const [{ id }, { t }] = await Promise.all([params, searchParams]);
    const session = await getSession();
    if (!session?.userId) {
        const back = `/events/${id}/check-in${t ? `?t=${encodeURIComponent(t)}` : ''}`;
        redirect(`/login?redirect=${encodeURIComponent(back)}`);
    }

    const event = await prisma.event.findFirst({
        where: { id, deletedAt: null },
        select: { id: true, title: true, date: true, creatorId: true, clubId: true },
    });
    if (!event) notFound();

    const back = (
        <Link href={`/events/${event.id}`} className={styles.back}>
            <ArrowLeft size={13} aria-hidden="true" />
            {event.title}
        </Link>
    );

    if (!(await canManageEvent(event, session))) {
        return (
            <div className={styles.page}>
                {back}
                <div className={styles.door} data-state="bad">
                    <span className={styles.doorStatus}>Organisers only</span>
                    <h1 className={styles.doorName}>This is the door list.</h1>
                    <p className={styles.doorNote}>
                        Only the people running this event can check tickets. If this is your ticket, show it to them at the entrance.
                    </p>
                </div>
            </div>
        );
    }

    const registrationId = readTicketToken(t);
    const [registration, going, arrived] = await Promise.all([
        registrationId
            ? prisma.eventRegistration.findFirst({
                  where: { id: registrationId, eventId: event.id },
                  select: {
                      status: true,
                      checkedInAt: true,
                      user: { select: { name: true, avatar: true, college: { select: { name: true } } } },
                  },
              })
            : null,
        prisma.eventRegistration.count({ where: { eventId: event.id, status: { in: [...GOING] } } }),
        prisma.eventRegistration.count({ where: { eventId: event.id, status: { in: [...GOING] }, checkedInAt: { not: null } } }),
    ]);

    const tally = (
        <p className={styles.doorNote}>
            {arrived} of {going} checked in ·{' '}
            <Link href={`/events/${event.id}/attendees`} className={styles.link}>
                attendee list
            </Link>
        </p>
    );

    let door: ReactNode;
    if (!t) {
        door = (
            <div className={styles.door}>
                <span className={styles.doorStatus}>Ready</span>
                <h1 className={styles.doorName}>Scan a ticket.</h1>
                <p className={styles.doorNote}>
                    Point your phone camera at an attendee&apos;s QR code and open the link. Their name comes up here with a button to let them in.
                </p>
                {tally}
            </div>
        );
    } else if (!registration) {
        door = (
            <div className={styles.door} data-state="bad">
                <span className={styles.doorStatus}>Not valid</span>
                <h1 className={styles.doorName}>This ticket is not for this event.</h1>
                <p className={styles.doorNote}>Ask them to open the event on Campus Connect and show the ticket there.</p>
                {tally}
            </div>
        );
    } else if (!(GOING as readonly string[]).includes(registration.status)) {
        door = (
            <div className={styles.door} data-state="bad">
                <span className={styles.doorStatus}>Not confirmed</span>
                <h1 className={styles.doorName}>{registration.user.name}</h1>
                <p className={styles.doorNote}>
                    {registration.status === 'PENDING_PAYMENT'
                        ? 'They signed up but have not paid yet. They can pay on the event page before you let them in.'
                        : 'This registration was cancelled, so the ticket no longer lets them in.'}
                </p>
                {tally}
            </div>
        );
    } else {
        const { user, checkedInAt } = registration;
        door = (
            <div className={styles.door} data-state={checkedInAt ? 'in' : undefined}>
                <span className={styles.doorAvatar}>
                    {user.avatar ? (
                        <Image src={user.avatar} alt="" width={88} height={88} />
                    ) : (
                        user.name.charAt(0).toUpperCase()
                    )}
                </span>
                <span className={styles.doorStatus}>
                    {checkedInAt
                        ? `Checked in at ${formatIST(checkedInAt, { hour: 'numeric', minute: '2-digit' })}`
                        : 'Not checked in yet'}
                </span>
                <h1 className={styles.doorName}>{user.name}</h1>
                {user.college ? <p className={styles.doorNote}>{user.college.name}</p> : null}
                {checkedInAt ? null : (
                    <form action={checkInWithTicket.bind(null, event.id, t)} className={styles.actions}>
                        <button type="submit" className={`btn btn-primary ${styles.big}`}>
                            Check in
                        </button>
                    </form>
                )}
                {tally}
            </div>
        );
    }

    return (
        <div className={styles.page}>
            {back}
            <p className={styles.label}>
                Door · {formatIST(event.date, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
            </p>
            {door}
        </div>
    );
}
