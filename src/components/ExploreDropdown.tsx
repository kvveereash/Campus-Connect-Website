'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Trophy, Map, Building2, PartyPopper } from 'lucide-react';
import { useT } from '@/lib/i18n';
import styles from './Navbar.module.css';

const ITEMS = [
    { href: '/fests', title: 'nav.fests', desc: 'nav.festsDesc', Icon: PartyPopper },
    { href: '/colleges', title: 'nav.colleges', desc: 'nav.collegesDesc', Icon: Building2 },
    { href: '/leaderboards', title: 'nav.leaderboard', desc: 'nav.leaderboardDesc', Icon: Trophy },
    { href: '/map', title: 'nav.venues', desc: 'nav.venuesDesc', Icon: Map },
] as const;

export default function ExploreDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    const t = useT();

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        function handleKey(event: KeyboardEvent) {
            if (event.key === 'Escape') setIsOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKey);
        };
    }, []);

    const isActive = ITEMS.some((i) => pathname.startsWith(i.href));

    return (
        <div
            className={styles.dropdownContainer}
            ref={dropdownRef}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <button
                type="button"
                className={`${styles.dropdownTrigger} ${isOpen ? styles.dropdownTriggerOpen : ''} ${isActive ? styles.active : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <span className={styles.navMark} style={{ background: 'var(--press-workshop)' }} aria-hidden="true" />
                {t('nav.explore')}
                <ChevronDown size={13} aria-hidden="true" className={styles.chevron} />
            </button>

            {isOpen && (
                <div className={styles.dropdownMenu}>
                    {ITEMS.map(({ href, title, desc, Icon }) => (
                        <Link key={href} href={href} className={styles.dropdownItem} onClick={() => setIsOpen(false)}>
                            <span className={styles.dropdownIcon} aria-hidden="true">
                                <Icon size={16} />
                            </span>
                            <span className={styles.dropdownText}>
                                <span className={styles.dropdownTitle}>{t(title)}</span>
                                <span className={styles.dropdownDesc}>{t(desc)}</span>
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
