'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { EventWithRelations } from '@/lib/actions';
import type { LandingStats, CategoryBandItem, FeaturedClub } from '@/lib/actions/landing';
import { dateParts } from './events/press';
import styles from './landing.module.css';

interface LandingClientProps {
    initialEvents: EventWithRelations[];
    stats: LandingStats;
    categories: CategoryBandItem[];
    clubs: FeaturedClub[];
}

/** Patient reveal on the system's curve — a slow camera move, not a snap. */
const rise = {
    hidden: { opacity: 0, y: 24 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 1.25, ease: [0.19, 1, 0.22, 1] as const },
    },
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.09 } } };
const inView = { once: true, margin: '-80px' } as const;

export default function LandingClient({ initialEvents, stats, categories, clubs }: LandingClientProps) {
    return (
        <div className={styles.page}>

            {/* ── Hero ─────────────────────────────────────────────────
                One monumental phrase over the page's only colour. No
                subhead crowding it, one action beneath. */}
            <section className={styles.hero}>
                {/* The sphere reads as a globe — a world of study. Three stacked
                    layers: colour bands, a slower sheen for depth, and a shadow
                    terminator so it has a lit side. Grain over the lot keeps it
                    from looking like flat CSS. */}
                <div className={styles.orbWrap} aria-hidden="true">
                    <div className={styles.orb} />
                    <div className={styles.orbSheen} />
                    <div className={styles.orbShade} />
                </div>
                <div className={styles.grain} aria-hidden="true" />
                <div className={styles.heroScrim} aria-hidden="true" />

                <motion.div
                    className={styles.heroInner}
                    initial="hidden"
                    animate="visible"
                    variants={stagger}
                >
                    <motion.h1 className={styles.heroTitle} variants={rise}>
                        Curious, <em>Connected</em>
                    </motion.h1>

                    <motion.div className={styles.heroDot} variants={rise} aria-hidden="true" />

                    <motion.p className={styles.heroMeta} variants={rise}>
                        {stats.events} events &middot; {stats.clubs} clubs &middot; {stats.colleges} colleges
                    </motion.p>

                    <motion.div className={styles.heroActions} variants={rise}>
                        <Link href="/events" className={styles.pillOnDark}>
                            See what&rsquo;s on
                            <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                    </motion.div>
                </motion.div>

                <ScrollBadge />
            </section>

            <div className={styles.inner}>

                {/* ── Stats ───────────────────────────────────────────── */}
                <motion.section
                    className={styles.section}
                    initial="hidden"
                    whileInView="visible"
                    viewport={inView}
                    variants={rise}
                >
                    <p className={styles.sectionLabel}>Where it stands</p>
                    <div className={styles.stats}>
                        <Stat value={stats.events} label="Events" />
                        <Stat value={stats.clubs} label="Clubs" />
                        <Stat value={stats.colleges} label="Colleges" />
                        <Stat value={stats.students} label="Students" />
                    </div>
                </motion.section>

                {/* ── Events, as full-width editorial rows ─────────────
                    Single column rather than a grid: each event gets the
                    full measure, image then title. */}
                {initialEvents.length > 0 && (
                    <section className={styles.section}>
                        <motion.div initial="hidden" whileInView="visible" viewport={inView} variants={rise}>
                            <p className={styles.sectionLabel}>Coming up</p>
                            <h2 className={styles.sectionTitle}>
                                The next things happening on campus.
                            </h2>
                        </motion.div>

                        <motion.div
                            className={styles.rows}
                            initial="hidden"
                            whileInView="visible"
                            viewport={inView}
                            variants={stagger}
                        >
                            {initialEvents.map((e) => {
                                const d = dateParts(e.date);
                                return (
                                    <motion.div key={e.id} variants={rise}>
                                        <Link href={`/events/${e.id}`} className={styles.row}>
                                            <div className={styles.rowMedia}>
                                                {e.thumbnail ? (
                                                    <Image
                                                        src={e.thumbnail}
                                                        alt=""
                                                        fill
                                                        sizes="(max-width: 1078px) 100vw, 1078px"
                                                    />
                                                ) : (
                                                    <span className={styles.rowStub} aria-hidden="true" />
                                                )}
                                            </div>
                                            <div className={styles.rowFoot}>
                                                <h3 className={styles.rowTitle}>{e.title}</h3>
                                                <span className={styles.rowMeta}>
                                                    {d.month} {d.day} &middot; {e.venue}
                                                </span>
                                            </div>
                                        </Link>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </section>
                )}

                {/* ── Categories, as a text index ─────────────────────── */}
                {categories.length > 0 && (
                    <section className={styles.section}>
                        <motion.div initial="hidden" whileInView="visible" viewport={inView} variants={rise}>
                            <p className={styles.sectionLabel}>Index</p>
                            <h2 className={styles.sectionTitle}>Browse by what you&rsquo;re into.</h2>
                        </motion.div>

                        <motion.div
                            className={styles.catList}
                            initial="hidden"
                            whileInView="visible"
                            viewport={inView}
                            variants={stagger}
                        >
                            {categories.map((c) => (
                                <motion.div key={c.name} variants={rise}>
                                    <Link
                                        href={`/events?category=${encodeURIComponent(c.name)}`}
                                        className={styles.catRow}
                                    >
                                        <span className={styles.catName}>{c.name}</span>
                                        <span className={styles.catCount}>
                                            {String(c.count).padStart(2, '0')}
                                        </span>
                                    </Link>
                                </motion.div>
                            ))}
                        </motion.div>
                    </section>
                )}
            </div>

            {/* ── Inverse band ───────────────────────────────────────── */}
            <motion.section
                className={styles.inverse}
                initial="hidden"
                whileInView="visible"
                viewport={inView}
                variants={rise}
            >
                <div style={{ maxWidth: 1078, margin: '0 auto' }}>
                    <p className={styles.sectionLabel}>What it does</p>
                    <h2 className={styles.inverseTitle}>Three things, done properly.</h2>
                    <div className={styles.inverseList}>
                        <div className={styles.inverseItem}>
                            <h3>Find what&rsquo;s on</h3>
                            <p>
                                Every verified event across campus in one list, ordered by when it
                                happens rather than when it was posted.
                            </p>
                        </div>
                        <div className={styles.inverseItem}>
                            <h3>Join a club</h3>
                            <p>
                                {stats.clubs} clubs across {stats.colleges} colleges, each with its
                                own feed, members and events.
                            </p>
                        </div>
                        <div className={styles.inverseItem}>
                            <h3>Build a team</h3>
                            <p>
                                Say what you&rsquo;re looking for before a hackathon and get matched
                                with people whose skills fill the gaps.
                            </p>
                        </div>
                    </div>
                </div>
            </motion.section>

            <div className={styles.inner}>

                {/* ── Clubs ───────────────────────────────────────────── */}
                {clubs.length > 0 && (
                    <section className={styles.section}>
                        <motion.div initial="hidden" whileInView="visible" viewport={inView} variants={rise}>
                            <p className={styles.sectionLabel}>Most active</p>
                            <h2 className={styles.sectionTitle}>Clubs worth joining.</h2>
                        </motion.div>

                        <motion.div
                            className={styles.clubList}
                            initial="hidden"
                            whileInView="visible"
                            viewport={inView}
                            variants={stagger}
                        >
                            {clubs.map((c) => (
                                <motion.div key={c.id} variants={rise}>
                                    <Link href={`/clubs/${c.id}`} className={styles.clubItem}>
                                        <span className={styles.clubLogo}>
                                            {c.logo ? (
                                                <Image src={c.logo} alt="" fill sizes="44px" style={{ objectFit: 'cover' }} />
                                            ) : (
                                                c.name.charAt(0).toUpperCase()
                                            )}
                                        </span>
                                        <span>
                                            <span className={styles.clubName}>{c.name}</span>
                                            <span className={styles.clubMeta}>
                                                {c.members} {c.members === 1 ? 'member' : 'members'}
                                                {c.events > 0 && ` · ${c.events} events`}
                                            </span>
                                        </span>
                                    </Link>
                                </motion.div>
                            ))}
                        </motion.div>
                    </section>
                )}

                {/* ── Close ───────────────────────────────────────────── */}
                <motion.section
                    className={styles.close}
                    initial="hidden"
                    whileInView="visible"
                    viewport={inView}
                    variants={rise}
                >
                    <h2 className={styles.closeTitle}>Start with this week.</h2>
                    <div className={styles.heroActions} style={{ justifyContent: 'flex-start', marginTop: 0 }}>
                        <Link href="/signup" className={styles.pillOnLight}>
                            Create an account
                            <ArrowRight size={15} aria-hidden="true" />
                        </Link>
                        <Link href="/events" className={styles.pillOnLight}>
                            Browse first
                        </Link>
                    </div>
                </motion.section>

            </div>
        </div>
    );
}

function Stat({ value, label }: { value: number; label: string }) {
    return (
        <div>
            <div className={styles.statValue}>{String(value).padStart(2, '0')}</div>
            <div className={styles.statLabel}>{label}</div>
        </div>
    );
}

/** Circular text badge, rotating slowly. Typographic punctuation, not a control. */
function ScrollBadge() {
    return (
        <svg className={styles.scrollBadge} viewBox="0 0 100 100" aria-hidden="true">
            <defs>
                <path id="badgeArc" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" fill="none" />
            </defs>
            <text fontSize="9.5" letterSpacing="2.4" fill="currentColor">
                <textPath href="#badgeArc">
                    SCROLL DOWN · SCROLL DOWN ·
                </textPath>
            </text>
        </svg>
    );
}
