import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { authHref } from '@/lib/utils';
import { canManageFest } from '../../access';
import { getFestForManaging } from '../../data';
import { festDateRange, istDateKey } from '../../rules';
import FestForm from '../../FestForm';
import Timetable from '../../Timetable';
import DeleteFest from './DeleteFest';
import styles from '../../manage.module.css';

/*
 * The organisers' view of a fest: dynamic, because it is per person. It is
 * also where a fest waiting for approval can be seen at all (the public page
 * is a 404 until then), with every attached event, pending ones included.
 */

export const metadata: Metadata = {
    title: 'Edit fest',
    robots: { index: false },
};

export default async function EditFestPage(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params;
    const [session, fest] = await Promise.all([getSession(), getFestForManaging(id)]);
    if (!session?.userId) redirect(authHref(`/fests/${id}/edit`));
    if (!fest) notFound();

    const allowed = await canManageFest(fest, session.userId as string, (session.user?.role as string) ?? 'USER');
    // Not "forbidden": whether a pending fest exists is not for strangers to learn.
    if (!allowed) notFound();

    const host = fest.club ? `${fest.club}, ${fest.college}` : fest.college;
    const pendingEvents = fest.events.filter((e) => !e.verified).length;
    const now = new Date().getTime();

    return (
        <div className={styles.page}>
            <Link href={fest.verified ? `/fests/${fest.id}` : '/fests'} className={styles.back}>
                <ArrowLeft size={13} aria-hidden="true" />
                {fest.verified ? 'Back to the fest' : 'All fests'}
            </Link>

            <div className={styles.layout}>
                <header className={styles.intro}>
                    <div className={styles.status}>
                        <span className={fest.verified ? styles.statusLive : styles.statusPending}>
                            {fest.verified ? 'On the board' : 'Waiting for approval'}
                        </span>
                        <span className={styles.statusDates}>{festDateRange(fest.startDate, fest.endDate)}</span>
                    </div>
                    <h1 className={styles.title}>{fest.name}</h1>
                    <p className={styles.lede}>
                        {fest.verified
                            ? 'Changes to the details go back to an admin before they show.'
                            : 'Only you and the other organisers can see this fest until an admin approves it. Add its events meanwhile.'}
                    </p>
                    <ol className={styles.steps}>
                        <li>
                            <span className={styles.stepNum}>01</span>
                            Host an event as usual and pick {fest.name} in the form.
                        </li>
                        <li>
                            <span className={styles.stepNum}>02</span>
                            It lands on the timetable below, under its day.
                        </li>
                    </ol>
                    <Link href="/events/create" className={styles.primaryLink}>
                        Host an event for this fest
                    </Link>
                </header>

                <section className={styles.sheet} aria-label="Fest details">
                    <FestForm
                        mode="edit"
                        festId={fest.id}
                        hostLine={`Hosted by ${host}. The host and college stay as they are.`}
                        initial={{
                            name: fest.name,
                            tagline: fest.tagline ?? '',
                            description: fest.description,
                            startDate: istDateKey(fest.startDate),
                            endDate: istDateKey(fest.endDate),
                            coverImage: fest.coverImage ?? '',
                        }}
                    />
                </section>
            </div>

            <section className={styles.timetable} aria-labelledby="timetable-title">
                <h2 id="timetable-title" className={styles.sectionTitle}>
                    The timetable <em className="accent">so far</em>
                </h2>
                <p className={styles.sectionNote}>
                    {fest.events.length} {fest.events.length === 1 ? 'event' : 'events'}
                    {pendingEvents > 0 ? `, ${pendingEvents} still waiting for approval` : ''}. Students see the
                    approved ones.
                </p>
                <Timetable
                    events={fest.events}
                    festStart={fest.startDate}
                    festEnd={fest.endDate}
                    now={now}
                    empty={{
                        title: 'No events in this fest yet',
                        text: 'Host an event and pick this fest in the form, and it appears here under its day.',
                        action: (
                            <Link href="/events/create" className={styles.emptyLink}>
                                Host the first event
                            </Link>
                        ),
                    }}
                />
            </section>

            <section className={styles.remove} aria-labelledby="remove-title">
                <h2 id="remove-title" className={styles.removeTitle}>
                    Take the fest down
                </h2>
                <p className={styles.removeText}>
                    The fest page goes. Its events stay on the board as single events.
                </p>
                <DeleteFest festId={fest.id} festName={fest.name} />
            </section>
        </div>
    );
}
