import Link from 'next/link';
import styles from './legal.module.css';

/** Every policy page, so the four cannot drift apart. */
export const POLICIES = [
    { href: '/legal/privacy', label: 'Privacy' },
    { href: '/legal/terms', label: 'Terms' },
    { href: '/legal/guidelines', label: 'Community guidelines' },
    { href: '/legal/refunds', label: 'Refunds & cancellations' },
] as const;

/**
 * The date these were written. A policy with no date is a policy nobody can
 * tell is current, and it is the first thing a reader looks for — so it is a
 * single constant here rather than four hand-typed strings that fall out of
 * step the moment one page is edited.
 */
export const LAST_UPDATED = '10 September 2026';

export default function LegalPage({
    label,
    title,
    lede,
    current,
    children,
}: {
    label: string;
    title: string;
    lede: string;
    /** href of this page, so it is not listed among its own siblings. */
    current: string;
    children: React.ReactNode;
}) {
    return (
        <div className={styles.page}>
            <p className={styles.label}>{label}</p>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.stamp}>Last updated {LAST_UPDATED}</p>

            <p className={styles.lede}>{lede}</p>

            {children}

            <div className={styles.foot}>
                <p>
                    This is a student project, and these pages describe what it actually does
                    rather than what a template says it might. If anything here is wrong, or you
                    want your data removed, write to{' '}
                    <a href="mailto:veereashkv@gmail.com">veereashkv@gmail.com</a>.
                </p>
                <div className={styles.related}>
                    {POLICIES.filter((p) => p.href !== current).map((p) => (
                        <Link key={p.href} href={p.href} className={styles.relatedLink}>
                            {p.label}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
