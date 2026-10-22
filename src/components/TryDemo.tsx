import styles from './TryDemo.module.css';

/**
 * "Try the demo": signs into the shared demo account (src/app/api/demo).
 * A plain form, so it works before any JavaScript has loaded.
 *
 * `variant="divided"` sits under a sign-in or sign-up form with an "or"
 * rule above it; `variant="link"` is a quiet line for the home page.
 */
export default function TryDemo({ variant = 'divided' }: { variant?: 'divided' | 'link' }) {
    if (variant === 'link') {
        return (
            <form action="/api/demo" method="post" className={styles.linkForm}>
                <button type="submit" className={styles.link}>
                    Or try the demo, no sign-up
                </button>
            </form>
        );
    }

    return (
        <form action="/api/demo" method="post" className={styles.divided}>
            <span className={styles.rule} aria-hidden="true">
                or
            </span>
            <button type="submit" className={`btn btn-outline ${styles.button}`}>
                Try the demo
            </button>
            <p className={styles.note}>A shared account with a ticket, an event to run and messages. It resets every night.</p>
        </form>
    );
}
