'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { isDemoEmail } from '@/lib/demo-account';
import styles from './DemoBanner.module.css';

/**
 * Shown on every page while signed in as the shared demo account: whose
 * account this is, that it resets, and the three places worth opening.
 */
export default function DemoBanner() {
    const { user } = useAuth();
    if (!isDemoEmail(user?.email)) return null;

    return (
        <aside className={styles.banner} aria-label="Demo account">
            <p className={styles.text}>
                <span className={styles.dot} aria-hidden="true" />
                <strong>You are in the demo account.</strong> Click around freely; it resets every night.
            </p>
            <nav className={styles.links}>
                <Link href="/profile">Your ticket and event</Link>
                <Link href="/messages">Messages</Link>
                <Link href="/signup" className={styles.cta}>
                    Sign up for real
                </Link>
            </nav>
        </aside>
    );
}
