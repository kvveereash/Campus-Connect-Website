import type { Metadata } from 'next';
import Link from 'next/link';
import { verifyEmail } from '@/lib/actions/email-verification';
import styles from '../forbidden/page.module.css';

export const metadata: Metadata = {
    title: 'Confirm your email',
    robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * The other end of the verification link.
 *
 * A server component, so the token is consumed by the request that opened the
 * link rather than after a round trip through the client — the link works with
 * JavaScript disabled, which for something arriving in an email client is the
 * right assumption.
 *
 * Each failure says which failure it is. "Invalid link" covers three quite
 * different situations, and only one of them is worth the reader's worry.
 */
export default async function VerifyEmailPage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string }>;
}) {
    const { token } = await searchParams;
    const result = await verifyEmail(token ?? '');

    const copy = {
        ok: {
            code: 'Done',
            title: 'Email confirmed.',
            body: result.email
                ? `${result.email} is confirmed. Password resets and notices will reach you there.`
                : 'Your address is confirmed.',
        },
        used: {
            code: 'Used',
            title: 'That link is spent.',
            body: 'Confirmation links work once. If your address is already confirmed there is nothing left to do — and if it is not, ask for a fresh link from your settings.',
        },
        expired: {
            code: 'Expired',
            title: 'That link has aged out.',
            body: 'Links last 24 hours. Sign in and ask for a new one; it will arrive in a moment.',
        },
        unknown: {
            code: '—',
            title: 'That link does not match anything.',
            body: 'It may have been cut short by an email client, or belong to an account that no longer exists. Copying the whole link from the email usually fixes it.',
        },
    }[result.status];

    return (
        <div className={styles.page}>
            <p className={styles.code}>{copy.code}</p>
            <h1 className={styles.title}>{copy.title}</h1>
            <p className={styles.text}>{copy.body}</p>

            <div className={styles.actions}>
                <Link href="/events" className={styles.pill}>
                    Browse events
                </Link>
                {result.status !== 'ok' && (
                    <Link href="/settings" className={styles.pillQuiet}>
                        Send a new link
                    </Link>
                )}
            </div>
        </div>
    );
}
