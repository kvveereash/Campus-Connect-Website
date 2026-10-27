'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/lib/i18n';
import styles from './Navbar.module.css';

export default function UserNav() {
    const { user, isLoading } = useAuth();
    const t = useT();

    // Same footprint as the signed-out pair, so the bar does not jump when
    // the session resolves.
    if (isLoading) {
        return <div className={styles.userPlaceholder} aria-hidden="true" />;
    }

    if (user) {
        return (
            <div className={styles.userMenu}>
                {/* Where your registrations and tickets are. On phones it is
                    at the top of the menu instead, to keep the bar short. */}
                <Link href="/my-events" className={`${styles.loginBtn} ${styles.myEvents}`}>
                    {t('nav.myEvents')}
                </Link>
                <Link href="/profile" className={styles.avatar} aria-label={t('user.profile', { name: user.name })}>
                    {user.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatar} alt="" />
                    ) : (
                        user.name.charAt(0).toUpperCase()
                    )}
                </Link>
            </div>
        );
    }

    return (
        <div className={styles.authPair}>
            <Link href="/login" className={styles.loginBtn}>
                {t('user.logIn')}
            </Link>
            <Link href="/signup" className={styles.joinBtn}>
                {t('footer.join')}
            </Link>
        </div>
    );
}
