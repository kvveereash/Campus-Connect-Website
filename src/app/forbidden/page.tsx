import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata: Metadata = {
    title: 'Not your page',
    description: 'You are signed in, but this page needs a permission your account does not have.',
    robots: { index: false, follow: false },
};

/**
 * 403.
 *
 * The middleware used to send non-admins to /events without a word, which is
 * the worst of both worlds: nothing was explained, and the redirect looked
 * like a bug — you clicked a link and landed somewhere else. Being told you
 * do not have access is a smaller problem than not knowing what happened.
 *
 * A 403 is not a 404. The page exists and you are signed in; what is missing
 * is a permission. Saying which one matters, because the fix is different:
 * signing in again will not help, and asking an administrator will.
 */
export default function ForbiddenPage() {
    return (
        <div className={styles.page}>
            <p className={styles.code}>403</p>
            <h1 className={styles.title}>That one is not yours.</h1>
            <p className={styles.text}>
                You are signed in, and the page is there — it just needs a permission your
                account does not have. Administrator pages are limited to accounts with the
                admin role, which is not something you can grant yourself.
            </p>
            <p className={styles.text}>
                If you think you should have it, ask whoever set up your account. If you
                followed a link here by accident, nothing has gone wrong.
            </p>

            <div className={styles.actions}>
                <Link href="/events" className={styles.pill}>
                    Browse events
                </Link>
                <Link href="/profile" className={styles.pillQuiet}>
                    Your profile
                </Link>
            </div>
        </div>
    );
}
