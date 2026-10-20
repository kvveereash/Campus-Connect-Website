import styles from '@/app/login/auth.module.css';

/**
 * The frame every auth screen shares: the campus-blue panel with one line on
 * it, and the form beside it on the canvas. Login and signup build the same
 * markup inline; the password-recovery screens use this so all four match.
 */
export default function AuthShell({
    line,
    note = 'Events · Clubs · Colleges',
    children,
}: {
    /** The sentence on the blue panel. */
    line: string;
    note?: string;
    children: React.ReactNode;
}) {
    return (
        <div className={styles.screen}>
            <aside className={styles.aside}>
                <div className={styles.glow} aria-hidden="true" />
                <span className={styles.wordmark}>Campus Connect</span>
                <div className={styles.asideBody}>
                    <p className={styles.asideLine}>{line}</p>
                </div>
                <span className={styles.asideNote}>{note}</span>
            </aside>
            <main className={styles.panel}>
                <div className={styles.form}>{children}</div>
            </main>
        </div>
    );
}

/** A success or error line under a form, in the system's own colours. */
export function AuthMessage({ type, children }: { type: 'success' | 'error'; children: React.ReactNode }) {
    return (
        <p
            role={type === 'error' ? 'alert' : 'status'}
            style={{
                margin: '0 0 16px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-input)',
                fontSize: 14,
                lineHeight: 1.45,
                background: type === 'success' ? '#e3f6ea' : '#fdecea',
                color: type === 'success' ? '#0b6b35' : '#a3241b',
                border: `1px solid ${type === 'success' ? '#b7e4c7' : '#f5c2bd'}`,
            }}
        >
            {children}
        </p>
    );
}
