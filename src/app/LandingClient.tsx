'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays, Users, Sparkles } from 'lucide-react';
import type { EventWithRelations } from '@/lib/actions';
import type { LandingStats, CategoryBandItem, FeaturedClub } from '@/lib/actions/landing';
import { inkFor, dateParts } from './events/press';
import styles from './landing.module.css';

interface LandingClientProps {
    initialEvents: EventWithRelations[];
    stats: LandingStats;
    categories: CategoryBandItem[];
    clubs: FeaturedClub[];
}

/** One shared entrance: rise and fade, on the system's glide curve. */
const rise = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.19, 1, 0.22, 1] as const } },
};

const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
};

export default function LandingClient({ initialEvents, stats, categories, clubs }: LandingClientProps) {
    // The hero card is the most prominent image on the site, so prefer the
    // soonest event that actually has a cover; a flat colour block reads as a
    // missing asset rather than a design choice at this size.
    const next = initialEvents.find((e) => e.thumbnail) ?? initialEvents[0];

    return (
        <div className={styles.page}>
            <div className={styles.inner}>

                {/* ── Hero ─────────────────────────────────────────────── */}
                <motion.section
                    className={styles.hero}
                    initial="hidden"
                    animate="visible"
                    variants={stagger}
                >
                    <motion.div variants={rise}>
                        <h1 className={styles.heroTitle}>
                            Everything happening on campus,{' '}
                            <span className={styles.heroMark}>in one place</span>.
                        </h1>
                        <p className={styles.heroLede}>
                            Hackathons, workshops, fests and club nights across {stats.colleges}{' '}
                            colleges. Find what&rsquo;s on, join a club, and put a team together.
                        </p>
                        <div className={styles.heroActions}>
                            <Link href="/events" className={styles.btnDark}>
                                Browse events
                                <ArrowRight size={16} aria-hidden="true" />
                            </Link>
                            <Link href="/clubs" className={styles.btnGhost}>
                                Explore clubs
                            </Link>
                        </div>
                    </motion.div>

                    {/* The aside is the genuine next event, not an illustration. */}
                    {next && (
                        <motion.div variants={rise}>
                            <Link
                                href={`/events/${next.id}`}
                                className={styles.heroAside}
                                style={{ ['--cat' as string]: inkFor(next.category), display: 'block' }}
                            >
                                <div className={styles.asideMedia}>
                                    {next.thumbnail ? (
                                        <Image
                                            src={next.thumbnail}
                                            alt=""
                                            fill
                                            priority
                                            sizes="(max-width: 900px) 100vw, 420px"
                                        />
                                    ) : (
                                        <div className={styles.asideStub} />
                                    )}
                                </div>
                                <div className={styles.asideBody}>
                                    <span className={styles.asideLabel}>
                                        <i className={styles.asideDot} aria-hidden="true" />
                                        Next up &middot; {next.category}
                                    </span>
                                    <h2 className={styles.asideTitle}>{next.title}</h2>
                                    <p className={styles.asideMeta}>
                                        {(() => {
                                            const d = dateParts(next.date);
                                            return `${d.month} ${d.day}, ${d.weekday}`;
                                        })()}{' '}
                                        &middot; {next.venue}
                                    </p>
                                </div>
                            </Link>
                        </motion.div>
                    )}
                </motion.section>

                {/* ── Stats ────────────────────────────────────────────── */}
                <motion.section
                    className={styles.section}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-60px' }}
                    variants={rise}
                >
                    <div className={styles.stats}>
                        <Stat value={stats.events} label="Events listed" />
                        <Stat value={stats.clubs} label="Clubs" />
                        <Stat value={stats.colleges} label="Colleges" />
                        <Stat value={stats.students} label="Students" />
                    </div>
                </motion.section>

                {/* ── Categories ───────────────────────────────────────── */}
                {categories.length > 0 && (
                    <section className={styles.section}>
                        <div className={styles.sectionHead}>
                            <div>
                                <p className={styles.eyebrow}>Browse by category</p>
                                <h2 className={styles.sectionTitle}>What&rsquo;s coming up</h2>
                            </div>
                            <Link href="/events" className={styles.seeAll}>
                                All events <ArrowRight size={14} aria-hidden="true" />
                            </Link>
                        </div>

                        <motion.div
                            className={styles.band}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-60px' }}
                            variants={stagger}
                        >
                            {categories.map((c) => (
                                <motion.div key={c.name} variants={rise}>
                                    <Link
                                        href={`/events?category=${encodeURIComponent(c.name)}`}
                                        className={styles.catCard}
                                        style={{ ['--cat' as string]: inkFor(c.name), display: 'block' }}
                                    >
                                        <div className={styles.catMedia}>
                                            {c.image && (
                                                <Image src={c.image} alt="" fill sizes="240px" />
                                            )}
                                        </div>
                                        <div className={styles.catBody}>
                                            <span className={styles.catName}>{c.name}</span>
                                            <span className={styles.catCount}>{c.count}</span>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </motion.div>
                    </section>
                )}

                {/* ── Next events ──────────────────────────────────────── */}
                {initialEvents.length > 0 && (
                    <section className={styles.section}>
                        <div className={styles.sectionHead}>
                            <div>
                                <p className={styles.eyebrow}>Happening soon</p>
                                <h2 className={styles.sectionTitle}>Next on campus</h2>
                            </div>
                        </div>

                        <motion.div
                            className={styles.eventGrid}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-60px' }}
                            variants={stagger}
                        >
                            {initialEvents.map((e) => {
                                const d = dateParts(e.date);
                                return (
                                    <motion.div key={e.id} variants={rise}>
                                        <Link
                                            href={`/events/${e.id}`}
                                            className={styles.eventCard}
                                            style={{ ['--cat' as string]: inkFor(e.category) }}
                                        >
                                            <div className={styles.eventMedia}>
                                                {e.thumbnail && (
                                                    <Image src={e.thumbnail} alt="" fill sizes="320px" />
                                                )}
                                            </div>
                                            <div className={styles.eventBody}>
                                                <h3 className={styles.eventTitle}>{e.title}</h3>
                                                <p className={styles.eventMeta}>
                                                    {d.month} {d.day} &middot; {e.venue}
                                                </p>
                                                <div className={styles.tagRow}>
                                                    <span className={styles.tag}>
                                                        <i className={styles.tagDot} aria-hidden="true" />
                                                        {e.category}
                                                    </span>
                                                    {e.price > 0 ? (
                                                        <span className={styles.tag}>${e.price}</span>
                                                    ) : (
                                                        <span className={`${styles.tag} ${styles.tagAccent}`}>
                                                            Free
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </section>
                )}

                {/* ── Inverted block ───────────────────────────────────── */}
                <section className={styles.section}>
                    <motion.div
                        className={styles.darkBlock}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-60px' }}
                        variants={rise}
                    >
                        <h2 className={styles.darkTitle}>Three things you can do here</h2>
                        <div className={styles.darkList}>
                            <div className={styles.darkItem}>
                                <span className={styles.darkIcon}>
                                    <CalendarDays size={18} aria-hidden="true" />
                                </span>
                                <h3>Find what&rsquo;s on</h3>
                                <p>
                                    Every verified event across campus in one list, grouped by when
                                    it happens rather than when it was posted.
                                </p>
                            </div>
                            <div className={styles.darkItem}>
                                <span className={styles.darkIcon}>
                                    <Users size={18} aria-hidden="true" />
                                </span>
                                <h3>Join a club</h3>
                                <p>
                                    {stats.clubs} clubs across {stats.colleges} colleges, each with
                                    its own feed, members and events.
                                </p>
                            </div>
                            <div className={styles.darkItem}>
                                <span className={styles.darkIcon}>
                                    <Sparkles size={18} aria-hidden="true" />
                                </span>
                                <h3>Build a team</h3>
                                <p>
                                    Post what you&rsquo;re looking for before a hackathon and get
                                    matched with people whose skills fill the gaps.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </section>

                {/* ── Clubs ────────────────────────────────────────────── */}
                {clubs.length > 0 && (
                    <section className={styles.section}>
                        <div className={styles.sectionHead}>
                            <div>
                                <p className={styles.eyebrow}>Most active</p>
                                <h2 className={styles.sectionTitle}>Clubs to join</h2>
                            </div>
                            <Link href="/clubs" className={styles.seeAll}>
                                All clubs <ArrowRight size={14} aria-hidden="true" />
                            </Link>
                        </div>

                        <motion.div
                            className={styles.clubGrid}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-60px' }}
                            variants={stagger}
                        >
                            {clubs.map((c) => (
                                <motion.div key={c.id} variants={rise}>
                                    <Link href={`/clubs/${c.id}`} className={styles.clubCard}>
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

                {/* ── Close ────────────────────────────────────────────── */}
                <section className={styles.section}>
                    <motion.div
                        className={styles.cta}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-60px' }}
                        variants={rise}
                    >
                        <h2 className={styles.ctaTitle}>Start with what&rsquo;s on this week</h2>
                        <p className={styles.ctaLede}>
                            Create an account to register for events, join clubs and message people
                            you meet along the way.
                        </p>
                        <div className={styles.ctaActions}>
                            <Link href="/signup" className={styles.btnDark}>
                                Create an account
                                <ArrowRight size={16} aria-hidden="true" />
                            </Link>
                            <Link href="/events" className={styles.btnGhost}>
                                Browse first
                            </Link>
                        </div>
                    </motion.div>
                </section>

            </div>
        </div>
    );
}

function Stat({ value, label }: { value: number; label: string }) {
    return (
        <div className={styles.stat}>
            <div className={styles.statValue}>{value}</div>
            <div className={styles.statLabel}>{label}</div>
        </div>
    );
}
