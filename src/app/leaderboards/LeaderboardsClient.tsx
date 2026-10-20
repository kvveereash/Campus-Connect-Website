'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import type { LeaderboardUser, LeaderboardClub } from '@/lib/actions/leaderboards';
import styles from './leaderboards.module.css';

interface LeaderboardsData {
    attendees: LeaderboardUser[];
    hosts: LeaderboardUser[];
    clubs: LeaderboardClub[];
    badges: LeaderboardUser[];
}

type TabId = 'attendees' | 'hosts' | 'clubs' | 'badges';

const TABS: { id: TabId; label: string; description: string; unit: string }[] = [
    { id: 'attendees', label: 'Attendees', description: 'Most events attended', unit: 'events' },
    { id: 'hosts', label: 'Hosts', description: 'Most events created', unit: 'hosted' },
    { id: 'clubs', label: 'Clubs', description: 'Most members', unit: 'members' },
    { id: 'badges', label: 'Badges', description: 'Most badges earned', unit: 'badges' },
];

const rise = {
    hidden: { opacity: 0, y: 14 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 1.25, ease: [0.19, 1, 0.22, 1] as const },
    },
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } };

export default function LeaderboardsClient({ data }: { data: LeaderboardsData }) {
    const [active, setActive] = useState<TabId>('attendees');
    const tab = TABS.find((t) => t.id === active)!;

    const rows =
        active === 'clubs'
            ? data.clubs.map((c) => ({
                  id: c.id,
                  rank: c.rank,
                  name: c.name,
                  sub: c.college,
                  image: c.logo,
                  score: c.memberCount,
                  href: `/clubs/${c.id}`,
              }))
            : data[active].map((u) => ({
                  id: u.id,
                  rank: u.rank,
                  name: u.name,
                  sub: u.college,
                  image: u.avatar,
                  score: u.score,
                  href: `/profile/${u.id}`,
              }));

    return (
        <div className={styles.page}>
            <header className={styles.masthead}>
                <div>
                    <p className={styles.label}>Standings</p>
                    <h1 className={styles.title}>
                        Who <em className="accent">turns up.</em>
                    </h1>
                </div>
                <p className={styles.note}>Counted from registrations, not self-reported</p>
            </header>

            <div className={styles.tabs} role="tablist" aria-label="Leaderboard">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        role="tab"
                        type="button"
                        className={styles.tab}
                        aria-selected={active === t.id}
                        onClick={() => setActive(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <p className={styles.tabDesc}>{tab.description}</p>

            {rows.length === 0 ? (
                <div className={styles.empty}>
                    <h2 className={styles.emptyTitle}>Nothing to rank yet.</h2>
                    <p className={styles.emptyText}>
                        This board fills in as people register for events and join clubs.
                    </p>
                </div>
            ) : (
                <motion.div
                    className={styles.list}
                    initial="hidden"
                    animate="visible"
                    variants={stagger}
                    key={active}
                >
                    {rows.map((row) => (
                        <motion.div key={row.id} variants={rise}>
                            <Link href={row.href} className={styles.row}>
                                <span
                                    className={`${styles.rank} ${row.rank > 3 ? styles.rankQuiet : ''}`}
                                >
                                    {String(row.rank).padStart(2, '0')}
                                </span>

                                <span className={styles.who}>
                                    <span className={styles.avatar}>
                                        {row.image ? (
                                            <Image src={row.image} alt="" fill sizes="40px" />
                                        ) : (
                                            row.name.charAt(0).toUpperCase()
                                        )}
                                    </span>
                                    <span>
                                        <span className={styles.name}>{row.name}</span>
                                        {row.sub && <span className={styles.sub}>{row.sub}</span>}
                                    </span>
                                </span>

                                {/* A zero is real information — it stays visible, but muted,
                                    rather than being hidden or dressed up. */}
                                <span
                                    className={`${styles.score} ${row.score === 0 ? styles.scoreZero : ''}`}
                                >
                                    <span className={styles.scoreValue}>{row.score}</span>
                                    <span className={styles.scoreLabel}>{tab.unit}</span>
                                </span>
                            </Link>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </div>
    );
}
