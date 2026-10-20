'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { resolveClubImage } from '@/lib/college-images';
import styles from './clubs.module.css';

interface Club {
    id: string;
    name: string;
    description: string;
    category: string;
    logo: string | null;
    collegeId: string;
    createdAt: string;
    updatedAt: string;
    college: { id: string; name: string };
    _count: { members: number; events?: number; posts?: number };
}

interface ClubListProps {
    initialClubs: Club[];
    user: { id: string; name: string } | null;
    joinedClubIds: string[];
}

const rise = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 1.25, ease: [0.19, 1, 0.22, 1] as const },
    },
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };

export default function ClubList({ initialClubs, user, joinedClubIds }: ClubListProps) {
    const [category, setCategory] = useState('All');
    const [mineOnly, setMineOnly] = useState(false);

    /**
     * Filters are built from the clubs themselves and carry counts, so a
     * filter can never point at an empty result.
     */
    const categories = useMemo(() => {
        const counts = new Map<string, number>();
        for (const c of initialClubs) counts.set(c.category, (counts.get(c.category) ?? 0) + 1);
        return [...counts.entries()].sort((a, b) => b[1] - a[1]);
    }, [initialClubs]);

    const visible = useMemo(
        () =>
            initialClubs
                .filter((c) => category === 'All' || c.category === category)
                .filter((c) => !mineOnly || joinedClubIds.includes(c.id)),
        [initialClubs, category, mineOnly, joinedClubIds]
    );

    const collegeCount = useMemo(
        () => new Set(initialClubs.map((c) => c.college?.name).filter(Boolean)).size,
        [initialClubs]
    );

    return (
        <div className={styles.page}>
            <header className={styles.masthead}>
                <div>
                    <p className={styles.label}>Societies</p>
                    <h1 className={styles.title}>
                        Find the people <mark>already doing it.</mark>
                    </h1>
                </div>
                <span className={styles.count}>
                    {initialClubs.length} clubs · {collegeCount} colleges
                </span>
            </header>

            <nav className={styles.controls} aria-label="Filter clubs">
                <button
                    type="button"
                    className={styles.pill}
                    aria-pressed={category === 'All' && !mineOnly}
                    onClick={() => { setCategory('All'); setMineOnly(false); }}
                >
                    All
                    <span className={styles.pillCount}>{initialClubs.length}</span>
                </button>

                {categories.map(([name, n]) => (
                    <button
                        key={name}
                        type="button"
                        className={styles.pill}
                        aria-pressed={category === name}
                        onClick={() => setCategory(category === name ? 'All' : name)}
                    >
                        {name}
                        <span className={styles.pillCount}>{n}</span>
                    </button>
                ))}

                {user && joinedClubIds.length > 0 && (
                    <button
                        type="button"
                        className={styles.pill}
                        aria-pressed={mineOnly}
                        onClick={() => setMineOnly((v) => !v)}
                    >
                        Mine
                        <span className={styles.pillCount}>{joinedClubIds.length}</span>
                    </button>
                )}

                <span className={styles.spacer} />

                <Link href="/clubs/create" className={styles.create}>
                    <Plus size={14} aria-hidden="true" />
                    Start a club
                </Link>
            </nav>

            {visible.length === 0 ? (
                <div className={styles.empty}>
                    <h2 className={styles.emptyTitle}>
                        {mineOnly ? 'You haven’t joined anything yet.' : 'Nothing here yet.'}
                    </h2>
                    <p className={styles.emptyText}>
                        {mineOnly
                            ? 'Clubs you join will collect here, with their events and posts.'
                            : 'No clubs match that filter.'}
                    </p>
                    <button
                        type="button"
                        className={styles.create}
                        onClick={() => { setCategory('All'); setMineOnly(false); }}
                    >
                        Show every club
                    </button>
                </div>
            ) : (
                <motion.div
                    className={styles.grid}
                    initial="hidden"
                    animate="visible"
                    variants={stagger}
                    key={`${category}-${mineOnly}`}
                >
                    {visible.map((club) => (
                        <motion.div key={club.id} variants={rise}>
                            <ClubItem club={club} joined={joinedClubIds.includes(club.id)} />
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </div>
    );
}

function ClubItem({ club, joined }: { club: Club; joined: boolean }) {
    const [src, setSrc] = useState(() => resolveClubImage(club));

    const members = club._count.members;
    const events = club._count.events ?? 0;

    return (
        <Link href={`/clubs/${club.id}`} className={styles.item}>
            <div className={styles.media}>
                <Image
                    src={src}
                    alt=""
                    fill
                    sizes="(max-width: 700px) 100vw, 520px"
                    onError={() =>
                        setSrc('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=800')
                    }
                />
            </div>

            <div className={styles.foot}>
                <h2 className={styles.name}>{club.name}</h2>
                <span className={styles.category}>{club.category}</span>
            </div>

            <p className={styles.meta}>
                {club.college?.name}
                <span className={styles.metaDivider}>/</span>
                {members} {members === 1 ? 'member' : 'members'}
                {events > 0 && (
                    <>
                        <span className={styles.metaDivider}>/</span>
                        {events} {events === 1 ? 'event' : 'events'}
                    </>
                )}
            </p>

            {joined && <span className={styles.joined}>Joined</span>}
        </Link>
    );
}
