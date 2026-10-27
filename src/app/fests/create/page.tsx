import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { authHref } from '@/lib/utils';
import { getFestHosts } from '../access';
import FestForm from '../FestForm';
import styles from '../manage.module.css';

export const metadata: Metadata = {
    title: 'Start a fest',
    description: 'Put your college fest on the board, with its whole timetable in one place.',
    robots: { index: false },
};

export default async function CreateFestPage() {
    const session = await getSession();
    if (!session?.userId) redirect(authHref('/fests/create'));

    const hosts = await getFestHosts(session.userId as string, (session.user?.role as string) ?? 'USER');
    const allowed = hosts.clubs.length > 0 || hosts.colleges !== null;

    return (
        <div className={styles.page}>
            <Link href="/fests" className={styles.back}>
                <ArrowLeft size={13} aria-hidden="true" />
                All fests
            </Link>

            <div className={styles.layout}>
                <header className={styles.intro}>
                    <h1 className={styles.title}>
                        Put your fest <em className="accent">on the board</em>
                    </h1>
                    <p className={styles.lede}>
                        One page for the whole fest: its dates, what it is about, and a timetable that fills in
                        as you add events.
                    </p>
                    <ol className={styles.steps}>
                        <li>
                            <span className={styles.stepNum}>01</span>
                            Start the fest here. An admin approves it, usually within a day.
                        </li>
                        <li>
                            <span className={styles.stepNum}>02</span>
                            Host each event as usual and pick this fest in the form. It joins the timetable.
                        </li>
                        <li>
                            <span className={styles.stepNum}>03</span>
                            Students save the whole fest in one tap and get a reminder before each event.
                        </li>
                    </ol>
                </header>

                {allowed ? (
                    <section className={styles.sheet} aria-label="Fest details">
                        <FestForm mode="create" hosts={hosts} />
                    </section>
                ) : (
                    <div className={styles.empty}>
                        <p className={styles.emptyTitle}>Fests are started by club admins</p>
                        <p className={styles.emptyText}>
                            You need to be an admin of an approved club to start a fest for its college.
                        </p>
                        <Link href="/clubs" className={styles.emptyLink}>
                            Find your club
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
