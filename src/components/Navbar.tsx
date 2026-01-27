'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NotificationBell } from './notifications/NotificationBell';
import UserNav from './UserNav';
import ThemeToggle from './ThemeToggle';
import ExploreDropdown from './ExploreDropdown'; // Added import
import { Search, Menu, X } from 'lucide-react'; // Added import for Search icon
import { useState } from 'react'; // Added useState
import styles from './Navbar.module.css';
import { useCommand } from '@/context/CommandContext';

export default function Navbar() {
    const pathname = usePathname();
    const { setIsOpen } = useCommand();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    return (
        <nav className={styles.navbar}>
            <div className={`container ${styles.navContainer}`}>
                <Link href="/" className={styles.logo}>
                    Campus Connect
                </Link>

                {/* Desktop Nav Items */}
                <div className={styles.navLinks}>
                    <Link href="/events" className={styles.navLink}>
                        Events
                    </Link>
                    <Link
                        href="/buzz"
                        className={`${styles.navLink} ${pathname === '/buzz' ? styles.active : ''}`}
                    >
                        Buzz ⚡
                    </Link>
                    <Link
                        href="/clubs"
                        className={`${styles.navLink} ${pathname.startsWith('/clubs') ? styles.active : ''}`}
                    >
                        Clubs
                    </Link>

                    <ExploreDropdown />
                </div>

                {/* Right Actions (Always Visible or Adaptive) */}
                <div className={styles.navActions}>
                    <button
                        onClick={() => setIsOpen(true)}
                        className={styles.searchButton}
                    >
                        <Search size={22} />
                    </button>
                    <NotificationBell />
                    <UserNav />

                    {/* Mobile Toggle */}
                    <button
                        className={styles.mobileToggle}
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Dropdown Menu */}
            {isMobileMenuOpen && (
                <div className={styles.mobileMenu}>
                    <Link href="/events" className={styles.mobileMenuLink} onClick={() => setIsMobileMenuOpen(false)}>
                        Events
                    </Link>
                    <Link href="/buzz" className={styles.mobileMenuLink} onClick={() => setIsMobileMenuOpen(false)}>
                        Buzz ⚡
                    </Link>

                    <Link href="/clubs" className={styles.mobileMenuLink} onClick={() => setIsMobileMenuOpen(false)}>
                        Clubs
                    </Link>

                    {/* Explore Section */}
                    <div className={styles.exploreSection}>
                        <p className={styles.exploreTitle}>Explore</p>
                        <div className={styles.exploreLinks}>
                            <Link href="/colleges" className={styles.mobileMenuLink} onClick={() => setIsMobileMenuOpen(false)}>
                                Colleges
                            </Link>
                            <Link href="/leaderboards" className={styles.mobileMenuLink} onClick={() => setIsMobileMenuOpen(false)}>
                                Leaderboard 🏆
                            </Link>
                            <Link href="/map" className={styles.mobileMenuLink} onClick={() => setIsMobileMenuOpen(false)}>
                                Campus Map
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </nav >
    );
}
