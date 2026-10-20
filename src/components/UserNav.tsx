'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import styles from './Navbar.module.css';

export default function UserNav() {
    const { user, isLoading } = useAuth();

    // Same footprint as the signed-out pair, so the bar does not jump when
    // the session resolves.
    if (isLoading) {
        return <div className={styles.userPlaceholder} aria-hidden="true" />;
    }

    if (user) {
        return (
            <div className={styles.userMenu}>
                <Link href="/profile" className={styles.avatar} aria-label={`Your profile, ${user.name}`}>
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
                Log in
            </Link>
            <Link href="/signup" className={styles.joinBtn}>
                Join free
            </Link>
        </div>
    );
}
