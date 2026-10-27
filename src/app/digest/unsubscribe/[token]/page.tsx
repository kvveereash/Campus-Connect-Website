import type { Metadata } from 'next';
import Link from 'next/link';
import prisma from '@/lib/db';
import { readDigestUnsubscribeToken } from '@/lib/ticket';
import styles from './page.module.css';

export const metadata: Metadata = {
    title: 'Monday email',
    robots: { index: false, follow: false },
    // The address holds a personal token; it should not travel in a Referer.
    referrer: 'no-referrer',
};

export const dynamic = 'force-dynamic';

/*
 * Where "Unsubscribe" in the weekly digest leads. Opening it changes nothing:
 * mail scanners follow every link in an email, so turning the digest off
 * takes the button, a plain form POST to /api/digest/unsubscribe/[token] that
 * works without JavaScript and comes back here. The page then reads the
 * setting itself, so what it says is always true.
 */
export default async function DigestUnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const userId = readDigestUnsubscribeToken(decodeURIComponent(token));
    const user = userId
        ? await prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { weeklyDigest: true } })
        : null;

    if (!user) {
        return (
            <div className={styles.wrap}>
                <div className={styles.card} data-state="bad">
                    <p className={styles.kicker}>Monday email</p>
                    <h1 className={styles.title}>This link does not work.</h1>
                    <p className={styles.text}>
                        It may have been cut short by your email app, or the account is gone. Sign in and turn the
                        Monday email off in your settings instead.
                    </p>
                    <Link href="/settings" className={styles.link}>
                        Open settings
                    </Link>
                </div>
            </div>
        );
    }

    if (!user.weeklyDigest) {
        return (
            <div className={styles.wrap}>
                <div className={styles.card}>
                    <p className={styles.kicker}>Monday email · Off</p>
                    <h1 className={styles.title}>
                        You will not get the Monday email <em className="accent">any more.</em>
                    </h1>
                    <p className={styles.text}>
                        Nothing else changes: event reminders and your notifications carry on as before. If you change
                        your mind, it can be turned back on in your settings.
                    </p>
                    <Link href="/settings" className={styles.link}>
                        Open settings
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.wrap}>
            <div className={styles.card}>
                <p className={styles.kicker}>Monday email</p>
                <h1 className={styles.title}>
                    Stop the <em className="accent">Monday</em> email?
                </h1>
                <p className={styles.text}>
                    Every Monday morning it lists what is on that week at your college, colleges you follow and your
                    clubs. Turning it off changes nothing else.
                </p>
                <form method="post" action={`/api/digest/unsubscribe/${encodeURIComponent(token)}`} className={styles.form}>
                    <input type="hidden" name="from" value="page" />
                    <button type="submit" className="btn btn-primary">
                        Turn off the Monday email
                    </button>
                </form>
            </div>
        </div>
    );
}
