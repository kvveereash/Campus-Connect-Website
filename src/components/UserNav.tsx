'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import styles from './Navbar.module.css';

export default function UserNav() {
    const { user, logout, isLoading } = useAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || isLoading) {
        return (
            <div style={{ width: '40px', height: '40px' }}></div> // Placeholder to prevent layout shift
        );
    }

    if (user) {
        return (
            <div className={styles.userMenu}>
                <Link href="/profile">
                    <div className={styles.avatar} title={user.name}>
                        {user.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={user.avatar}
                                alt={user.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            user.name.charAt(0).toUpperCase()
                        )}
                    </div>
                </Link>
            </div>
        );
    }

    return (
        <Link href="/login" className={styles.loginBtn}>
            Login
        </Link>
    );
}
