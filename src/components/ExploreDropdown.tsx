'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Trophy, Map, Building2, Users } from 'lucide-react';
import styles from './Navbar.module.css';

const ITEMS = [
    {
        href: '/colleges',
        title: 'Colleges',
        desc: 'Every campus on the board, with its clubs and events.',
        Icon: Building2,
    },
    {
        href: '/team-finder',
        title: 'Team finder',
        desc: 'Post what you need for the next hackathon. Get matched.',
        Icon: Users,
    },
    {
        href: '/leaderboards',
        title: 'Leaderboard',
        desc: 'The most active students and clubs this term.',
        Icon: Trophy,
    },
    {
        href: '/map',
        title: 'Venues',
        desc: 'Every venue with something coming up.',
        Icon: Map,
    },
] as const;

export default function ExploreDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

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
                Explore
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
                                <span className={styles.dropdownTitle}>{title}</span>
                                <span className={styles.dropdownDesc}>{desc}</span>
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
