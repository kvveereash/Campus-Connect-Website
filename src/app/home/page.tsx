import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, CalendarCheck, Megaphone, Plus, Users } from 'lucide-react';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import EventRow, { ROW_EVENT_SELECT } from '@/app/events/EventRow';
import InstallPrompt from '@/components/InstallPrompt';
import press from '@/app/events/press.module.css';
import styles from './page.module.css';

export const metadata: Metadata = {
    title: 'Home',
    description: 'Your next events, your clubs, and what is on at your college.',
};

/*
 * The signed-in home. The landing page at / is a long pitch for people who
 * have not joined yet; a student who has joined was still shown it, "Join
 * free" buttons and all. The middleware now sends them here instead, to
 * what they came back for: their next event, their college, their clubs.
 * Per person, so rendered per request.
 */
export default async function MemberHome() {
    const session = await getSession();
    if (!session?.userId) redirect('/login?redirect=%2Fhome');
    const userId = session.userId as string;
    const collegeId = session.user?.collegeId || null;
    const firstName = (session.user?.name || '').trim().split(/\s+/)[0] || 'there';
    const now = new Date();

    const [mine, nearby, memberships, saved] = await Promise.all([
        prisma.eventRegistration.findMany({
            where: {
                userId,
                status: { in: ['PAID', 'COMPLETED', 'PENDING_PAYMENT'] },
                event: { deletedAt: null, date: { gte: now } },
            },
            select: { id: true, status: true, event: { select: ROW_EVENT_SELECT } },
            orderBy: { event: { date: 'asc' } },
            take: 3,
        }),
        prisma.event.findMany({
            where: {
                verified: true,
                deletedAt: null,
                date: { gte: now },
                // Not ones you are already going to, or have saved.
                registrations: { none: { userId } },
                interests: { none: { userId } },
                ...(collegeId ? { hostCollegeId: collegeId } : {}),
            },
            select: ROW_EVENT_SELECT,
            orderBy: { date: 'asc' },
            take: 4,
        }),
        prisma.clubMember.findMany({
            where: { userId, club: { deletedAt: null } },
            select: { club: { select: { id: true, name: true } } },
            orderBy: { joinedAt: 'desc' },
            take: 12,
        }),
        prisma.eventInterest.findMany({
            where: { userId, event: { verified: true, deletedAt: null, date: { gte: now } } },
            select: { id: true, event: { select: ROW_EVENT_SELECT } },
            orderBy: { event: { date: 'asc' } },
            take: 4,
        }),
    ]);

    return (
        <div className={press.screen} style={{ ['--rail-h' as string]: '0px' }}>
            <div className={press.inner}>
                <header className={press.masthead}>
                    <p className="mono-label">Hi {firstName}</p>
                    <h1 className={press.wordmark}>
                        Here&rsquo;s your <em className="accent">week</em>
                    </h1>
                </header>

                <nav className={styles.quick} aria-label="Shortcuts">
                    <Link href="/events" className={styles.quickLink}>
                        <ArrowRight size={16} aria-hidden="true" />
                        Browse events
                    </Link>
                    <Link href="/my-events" className={styles.quickLink}>
                        <CalendarCheck size={16} aria-hidden="true" />
                        My events
                    </Link>
                    <Link href="/team-finder" className={styles.quickLink}>
                        <Users size={16} aria-hidden="true" />
                        Team finder
                    </Link>
                    <Link href="/buzz" className={styles.quickLink}>
                        <Megaphone size={16} aria-hidden="true" />
                        Club posts
                    </Link>
                    <Link href="/events/create" className={styles.quickLink}>
                        <Plus size={16} aria-hidden="true" />
                        Post an event
                    </Link>
                </nav>

                <InstallPrompt />

                <section aria-labelledby="home-next">
                    <div className={press.groupHead}>
                        <h2 id="home-next">You&rsquo;re going to</h2>
                        {mine.length > 0 && (
                            <Link href="/my-events" className={styles.more}>
                                All my events
                            </Link>
                        )}
                    </div>
                    {mine.length > 0 ? (
                        mine.map((r) => (
                            <EventRow
                                key={r.id}
                                event={r.event}
                                note={r.status === 'PENDING_PAYMENT' ? 'Payment pending' : undefined}
                            />
                        ))
                    ) : (
                        <div className={press.empty}>
                            <p className={press.emptyTitle}>Nothing booked yet</p>
                            <p>Register for an event and your ticket shows up here.</p>
                            <Link href="/events" className="btn btn-primary">
                                Find something on
                            </Link>
                        </div>
                    )}
                </section>

                {saved.length > 0 && (
                    <section aria-labelledby="home-saved">
                        <div className={press.groupHead}>
                            <h2 id="home-saved">Saved</h2>
                            <span className={press.groupCount}>{saved.length}</span>
                        </div>
                        {saved.map((s) => (
                            <EventRow key={s.id} event={s.event} note="Saved" />
                        ))}
                    </section>
                )}

                <section aria-labelledby="home-nearby">
                    <div className={press.groupHead}>
                        <h2 id="home-nearby">{collegeId ? 'At your college' : 'Coming up'}</h2>
                        <Link
                            href={collegeId ? '/events?where=my-college' : '/events'}
                            className={styles.more}
                        >
                            See all
                        </Link>
                    </div>
                    {nearby.length > 0 ? (
                        nearby.map((event) => <EventRow key={event.id} event={event} />)
                    ) : (
                        <div className={press.empty}>
                            <p className={press.emptyTitle}>
                                {collegeId ? 'Nothing new at your college' : 'Nothing new coming up'}
                            </p>
                            <p>
                                {collegeId
                                    ? 'Look across every campus, or put your own event on the board.'
                                    : 'Add your college to your profile to see what is on there first.'}
                            </p>
                            <Link href={collegeId ? '/events' : '/profile'} className="btn btn-outline">
                                {collegeId ? 'Browse every campus' : 'Edit your profile'}
                            </Link>
                        </div>
                    )}
                </section>

                <section aria-labelledby="home-clubs">
                    <div className={press.groupHead}>
                        <h2 id="home-clubs">Your clubs</h2>
                        <Link href="/clubs" className={styles.more}>
                            {memberships.length > 0 ? 'Find more' : 'Browse clubs'}
                        </Link>
                    </div>
                    {memberships.length > 0 ? (
                        <div className={styles.clubs}>
                            {memberships.map(({ club }) => (
                                <Link key={club.id} href={`/clubs/${club.id}`} className={press.chip}>
                                    {club.name}
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className={styles.quiet}>
                            Join a club and its events and posts come to you.{' '}
                            <Link href="/clubs">Browse clubs</Link>
                        </p>
                    )}
                </section>
            </div>
        </div>
    );
}
