'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, ArrowRight } from 'lucide-react';
import { resolveCollegeImage } from '@/lib/college-images';
import styles from './colleges.module.css';
import entrance from '@/components/entrance.module.css';

interface College {
    id: string;
    name: string;
    location: string;
    description: string;
    logo: string;
    students?: number;
    clubs?: number;
    events?: number;
}

interface CollegesClientProps {
    initialColleges: College[];
}

// Each row waits its turn; capped so a long list does not keep the last
// rows blank for seconds.
const stagger = (i: number) => ({ '--delay': `${Math.min(i, 12) * 0.04}s` }) as CSSProperties;

export default function CollegesClient({ initialColleges }: CollegesClientProps) {
    const [query, setQuery] = useState('');

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return initialColleges;
        return initialColleges.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                (c.location ?? '').toLowerCase().includes(q)
        );
    }, [initialColleges, query]);

    return (
        <div className={styles.page}>
            <header className={styles.masthead}>
                <div>
                    <p className={styles.label}>Campuses</p>
                    <h1 className={styles.title}>
                        Every campus, <em className="accent">one feed.</em>
                    </h1>
                </div>
                <span className={styles.count}>
                    {initialColleges.length} institutions
                </span>
            </header>

            <div className={styles.searchRow}>
                <Search size={16} aria-hidden="true" />
                <input
                    className={styles.searchInput}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name or city"
                    aria-label="Search colleges"
                />
                {query && (
                    <button type="button" className={styles.clear} onClick={() => setQuery('')}>
                        Clear
                    </button>
                )}
            </div>

            {visible.length === 0 ? (
                <div className={styles.empty}>
                    <h2 className={styles.emptyTitle}>Nothing matches “{query}”.</h2>
                    <p className={styles.emptyText}>Try a different name or city.</p>
                </div>
            ) : (
                // Keyed on the search so new results replay the entrance.
                <div className={styles.list} key={query}>
                    {visible.map((college, i) => (
                        <div key={college.id} className={entrance.rise} style={stagger(i)}>
                            <CollegeRow college={college} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function CollegeRow({ college }: { college: College }) {
    const clubs = college.clubs ?? 0;
    const events = college.events ?? 0;

    return (
        <Link href={`/colleges/${college.id}`} className={styles.row}>
            {/* The campus photo sits in its own column. It used to float in
                on hover at a fixed offset, landing on top of the counts. */}
            <span className={styles.thumb} aria-hidden="true">
                <Image
                    src={resolveCollegeImage(college)}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 88px, 132px"
                />
            </span>

            <div className={styles.rowText}>
                <h2 className={styles.name}>{college.name}</h2>
                <p className={styles.place}>
                    {college.location && college.location !== 'Unspecified' ? college.location : 'Location not added'}
                </p>
            </div>

            <div className={styles.figures}>
                <span className={styles.figure}>
                    <b>{String(clubs).padStart(2, '0')}</b>
                    Clubs
                </span>
                <span className={styles.figure}>
                    <b>{String(events).padStart(2, '0')}</b>
                    Events
                </span>
            </div>

            <ArrowRight size={18} className={styles.arrow} aria-hidden="true" />
        </Link>
    );
}
