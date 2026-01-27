'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Trophy, Map, Building2 } from 'lucide-react';
import styles from './Navbar.module.css';

export default function ExploreDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Check if any child link is active
    const isActive = ['/colleges', '/leaderboards', '/map'].some(path => pathname.startsWith(path));

    return (
        <div
            className={styles.dropdownContainer}
            ref={dropdownRef}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <button
                className={`${styles.dropdownTrigger} ${isOpen ? styles.dropdownTriggerOpen : ''} ${isActive ? styles.active : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                Explore <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
            </button>

            {isOpen && (
                <div className={styles.dropdownMenu}>
                    <Link href="/colleges" className={styles.dropdownItem} onClick={() => setIsOpen(false)}>
                        <Building2 size={20} className={styles.dropdownIcon} />
                        <div className={styles.dropdownText}>
                            <span className={styles.dropdownTitle}>Colleges</span>
                            <span className={styles.dropdownDesc}>Browse campuses, reviews, and community insights.</span>
                        </div>
                    </Link>

                    <Link href="/leaderboards" className={styles.dropdownItem} onClick={() => setIsOpen(false)}>
                        <Trophy size={20} className={styles.dropdownIcon} />
                        <div className={styles.dropdownText}>
                            <span className={styles.dropdownTitle}>Leaderboard</span>
                            <span className={styles.dropdownDesc}>See the top performers and club rankings.</span>
                        </div>
                    </Link>

                    <Link href="/map" className={styles.dropdownItem} onClick={() => setIsOpen(false)}>
                        <Map size={20} className={styles.dropdownIcon} />
                        <div className={styles.dropdownText}>
                            <span className={styles.dropdownTitle}>Campus Map</span>
                            <span className={styles.dropdownDesc}>Navigate your way around the campus events.</span>
                        </div>
                    </Link>
                </div>
            )}
        </div>
    );
}
