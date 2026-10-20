'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NotificationBell } from './notifications/NotificationBell';
import UserNav from './UserNav';
import ExploreDropdown from './ExploreDropdown';
import { Search, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import styles from './Navbar.module.css';
import { useCommand } from '@/context/CommandContext';

/**
 * The three places people actually go. Each carries its category square,
 * the same mark the events board uses, so the nav reads as the index of
 * the board rather than a row of words.
 */
const PRIMARY = [
    { href: '/events', label: 'Events', mark: 'var(--press-technology)' },
    { href: '/buzz', label: 'Buzz', mark: 'var(--press-cultural)' },
    { href: '/clubs', label: 'Clubs', mark: 'var(--press-sports)' },
] as const;

const EXPLORE = [
    { href: '/colleges', label: 'Colleges' },
    { href: '/team-finder', label: 'Team finder' },
    { href: '/leaderboards', label: 'Leaderboard' },
    { href: '/map', label: 'Venues' },
] as const;

export default function Navbar() {
    const pathname = usePathname();
    const { setIsOpen } = useCommand();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 8);
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // A route change is the end of whatever the menu was open for.
    useEffect(() => {
        setIsMobileMenuOpen(false); // eslint-disable-line react-hooks/set-state-in-effect
    }, [pathname]);

    useEffect(() => {
        if (!isMobileMenuOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsMobileMenuOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isMobileMenuOpen]);

    const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

    return (
        <nav className={`${styles.navbar} ${scrolled ? styles.navbarScrolled : ''}`} aria-label="Main">
            <div className={`container ${styles.navContainer}`}>
                <Link href="/" className={styles.logo} aria-label="Campus Connect, home">
                    <span className={styles.logoMark} aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <circle cx="6" cy="7" r="3" fill="currentColor" />
                            <circle cx="18" cy="17" r="3" fill="currentColor" />
                            <path d="M8.5 8.5 C 13 9, 11 15, 15.5 15.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                        </svg>
                    </span>
                    <span className={styles.logoText}>Campus Connect</span>
                </Link>

                <div className={styles.navLinks}>
                    {PRIMARY.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navLink} ${isActive(item.href) ? styles.active : ''}`}
                            aria-current={isActive(item.href) ? 'page' : undefined}
                        >
                            <span className={styles.navMark} style={{ background: item.mark }} aria-hidden="true" />
                            {item.label}
                        </Link>
                    ))}
                    <ExploreDropdown />
                </div>

                <div className={styles.navActions}>
                    <button
                        type="button"
                        onClick={() => setIsOpen(true)}
                        className={styles.searchButton}
                        aria-label="Search events, clubs and people"
                    >
                        <Search size={16} aria-hidden="true" />
                        <span className={styles.searchText}>Search</span>
                        <kbd className={styles.kbd}>⌘K</kbd>
                    </button>
                    <NotificationBell />
                    <UserNav />

                    <button
                        type="button"
                        className={styles.mobileToggle}
                        onClick={() => setIsMobileMenuOpen((o) => !o)}
                        aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={isMobileMenuOpen}
                        aria-controls="mobile-menu"
                    >
                        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>

            <div
                id="mobile-menu"
                className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.mobileMenuOpen : ''}`}
                hidden={!isMobileMenuOpen}
            >
                {PRIMARY.map((item) => (
                    <Link key={item.href} href={item.href} className={styles.mobileMenuLink}>
                        <span className={styles.navMark} style={{ background: item.mark }} aria-hidden="true" />
                        {item.label}
                    </Link>
                ))}

                <div className={styles.exploreSection}>
                    <p className={styles.exploreTitle}>Explore</p>
                    <div className={styles.exploreLinks}>
                        {EXPLORE.map((item) => (
                            <Link key={item.href} href={item.href} className={styles.mobileMenuLink}>
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </nav>
    );
}
