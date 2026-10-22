import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import EventRow, { type RowEvent } from '@/app/events/EventRow';
import styles from '@/app/events/press.module.css';

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

    const registrations = await prisma.eventRegistration.findMany({
        where: {
            userId: session.userId as string,
            status: { in: ['PAID', 'COMPLETED', 'PENDING_PAYMENT'] },
            event: { deletedAt: null },
        },
        select: {
            id: true,
            status: true,
            event: {
                select: {
                    id: true,
                    title: true,
                    date: true,
                    venue: true,
                    category: true,
                    price: true,
                    thumbnail: true,
                    registrationCount: true,
                    club: { select: { name: true } },
                    hostCollege: { select: { name: true } },
                },
            },
        },
        orderBy: { event: { date: 'asc' } },
    });

    const now = new Date();
    const upcoming = registrations.filter((r) => r.event.date >= now);
    const toPay = upcoming.filter((r) => r.status === 'PENDING_PAYMENT');
    const going = upcoming.filter((r) => r.status !== 'PENDING_PAYMENT');
    // Unpaid places for past events are not places; most recent first.
    const past = registrations
        .filter((r) => r.event.date < now && r.status !== 'PENDING_PAYMENT')
        .reverse();

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
                    {registrations.length === 0 ? (
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
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
