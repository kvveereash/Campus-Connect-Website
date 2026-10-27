'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { isDemoEmail } from '@/lib/demo-account';
import { useT } from '@/lib/i18n';
import styles from './DemoBanner.module.css';

/**
 * Shown on every page while signed in as the shared demo account: whose
 * account this is, that it resets, and the three places worth opening.
 */
export default function DemoBanner() {
    const { user } = useAuth();
    const t = useT();
    if (!isDemoEmail(user?.email)) return null;

    return (
        <aside className={styles.banner} aria-label="Demo account">
            <p className={styles.text}>
                <span className={styles.dot} aria-hidden="true" />
                <strong>{t('demo.title')}</strong> {t('demo.body')}
            </p>
            <nav className={styles.links}>
                <Link href="/profile">{t('demo.ticket')}</Link>
                <Link href="/messages">{t('demo.messages')}</Link>
                <Link href="/signup" className={styles.cta}>
                    {t('demo.signUp')}
                </Link>
            </nav>
        </aside>
    );
}
