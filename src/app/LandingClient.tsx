'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import CustomCursor from '@/components/ui/CustomCursor';
import styles from './page.module.css';
import { motion, AnimatePresence, useMotionValue, useSpring, useScroll, useTransform } from 'framer-motion';
import { EventWithRelations } from '@/lib/actions';

// ─── Data ─────────────────────────────────────────────────────────────────
const TESTIMONIALS_ROW_1 = [
    { text: "I've been using Campus Connect almost every day. It's probably my favorite way to find hackathon teammates!", author: "Sarah Jenkins", role: "CS Student", stars: 5 },
    { text: "Literally a game changer. Found 3 critical team members for our startup project in 24 hours.", author: "Jessica Lee", role: "Founder", stars: 5 },
    { text: "The UI is just stunning. It feels like I'm using a premium tool, not just a college board.", author: "Alex R.", role: "UX Designer", stars: 5 },
    { text: "This is the best product I've seen for student collaboration. It actually helps me organize club events.", author: "Davide N.", role: "Event Organizer", stars: 4 },
];

const TESTIMONIALS_ROW_2 = [
    { text: "I can make quick connections while browsing because the platform really understands the context.", author: "Mike Chen", role: "Design Club Lead", stars: 5 },
    { text: "Finally, a place where I can actually see what's happening on campus without checking 50 groups.", author: "Priya S.", role: "Student", stars: 5 },
    { text: "Organizing the cultural fest was a breeze thanks to the event management tools here.", author: "Rahul M.", role: "Cultural Sec", stars: 4 },
    { text: "Found my co-founder here. No joke. The smart matching actually works.", author: "Ananya K.", role: "Startup Founder", stars: 5 },
];

const ACTIVITY_FEED = [
    { emoji: "⚡", text: "Sarah joined React Developers Club", time: "2m ago", color: "#c4b5fd" },
    { emoji: "🔥", text: "New hackathon posted: BuildCon 2026", time: "12m ago", color: "#FF7D5D" },
    { emoji: "🎯", text: "Team formed for AI Challenge", time: "28m ago", color: "#86efac" },
    { emoji: "🎨", text: "Design Sprint event registration open", time: "1h ago", color: "#fde047" },
    { emoji: "🚀", text: "3 new clubs created this week", time: "3h ago", color: "#fda4af" },
];

const CARD_IMAGES = [
    '/featured-hackathon.jpg',
    '/event-thumb-fest.png',
    '/event-thumb-workshop.png',
];

const ROTATING_WORDS = ['connected.', 'amplified.', 'elevated.', 'unleashed.'];

// ─── Type ──────────────────────────────────────────────────────────────────
interface LandingClientProps {
    initialEvents: EventWithRelations[];
}

// ─── Sparkline Component ───────────────────────────────────────────────────
function Sparkline() {
    const points = [4, 12, 8, 22, 16, 28, 20, 35, 30, 42, 38, 48];
    const maxY = 50;
    const stepX = 100 / (points.length - 1);
    const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * stepX} ${maxY - p}`).join(' ');

    return (
        <svg viewBox={`0 0 100 ${maxY}`} className={styles.sparklineContainer} preserveAspectRatio="none">
            <motion.path
                d={d}
                className={styles.sparklinePath}
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
            />
        </svg>
    );
}

// ─── Star Rating Component ────────────────────────────────────────────────
function StarRating({ count }: { count: number }) {
    return (
        <div className={styles.starRating}>
            {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={styles.star} style={{ opacity: i < count ? 1 : 0.2 }}>★</span>
            ))}
        </div>
    );
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function LandingClient({ initialEvents }: LandingClientProps) {
    const [mounted, setMounted] = useState(false);
    const [activeCard, setActiveCard] = useState(0);
    const [wordIndex, setWordIndex] = useState(0);

    useEffect(() => {
        setMounted(true);
    }, [initialEvents]);

    // Auto-rotate card stack
    useEffect(() => {
        const cards = initialEvents.length > 0 ? initialEvents : [null, null, null];
        const timer = setInterval(() => {
            setActiveCard((prev) => (prev + 1) % cards.length);
        }, 3000);
        return () => clearInterval(timer);
    }, [initialEvents]);

    // Rotating words
    useEffect(() => {
        const timer = setInterval(() => {
            setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
        }, 2500);
        return () => clearInterval(timer);
    }, []);

    // --- Parallax Hooks for Featured Card ---
    const featuredX = useMotionValue(0);
    const featuredY = useMotionValue(0);
    const springConfig = { damping: 25, stiffness: 150 };
    const springFeaturedX = useSpring(featuredX, springConfig);
    const springFeaturedY = useSpring(featuredY, springConfig);

    const handleFeaturedMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        featuredX.set(x * -0.08);
        featuredY.set(y * -0.08);
    };

    const handleFeaturedMouseLeave = () => {
        featuredX.set(0);
        featuredY.set(0);
    };

    // Scroll-based hero parallax
    const { scrollY } = useScroll();
    const heroImageY = useTransform(scrollY, [0, 600], [0, -80]);
    const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
    const scrollIndicatorOpacity = useTransform(scrollY, [0, 200], [1, 0]);

    const fadeInUp = {
        hidden: { opacity: 0, y: 40, filter: 'blur(10px)' },
        visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.9, ease: 'easeOut' as const } }
    };

    const stagger = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } }
    };

    // Build display cards from real events or fallback
    const displayCards = initialEvents.length > 0
        ? initialEvents.slice(0, 3).map((ev) => ({
            title: ev.title,
            badge: ev.category || 'EVENT',
            meta: ev.date ? new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
            image: ev.title.includes('Hackathon') ? '/featured-hackathon.jpg' : (ev.thumbnail || CARD_IMAGES[0]),
        }))
        : [
            { title: 'Annual Hackathon 2026', badge: 'TECHNOLOGY', meta: 'Mar 15', image: CARD_IMAGES[0] },
            { title: 'Spring Cultural Fest', badge: 'CULTURAL', meta: 'Apr 2', image: CARD_IMAGES[1] },
            { title: 'AI Workshop Series', badge: 'WORKSHOP', meta: 'Apr 10', image: CARD_IMAGES[2] },
        ];

    return (
        <div className={styles.container} data-theme={mounted ? 'light' : undefined}>
            <CustomCursor />

            {/* ═══ § 1 : HERO ═══════════════════════════════════════════════ */}
            <div className={styles.heroWrapper}>
                <section className={styles.hero}>
                    <motion.div
                        className={styles.heroContent}
                        initial="hidden"
                        animate="visible"
                        variants={stagger}
                    >
                        <motion.div className={styles.heroLabel} variants={fadeInUp}>
                            <motion.span
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", repeatDelay: 3 }}
                                style={{ display: 'inline-block' }}
                            >
                                ✨
                            </motion.span>
                            Built for students, by students
                        </motion.div>

                        <motion.h1 className={styles.heroTitle} variants={stagger}>
                            {["Your", "campus,"].map((word, i) => (
                                <motion.span
                                    key={i}
                                    variants={fadeInUp}
                                    style={{ display: 'inline-block', marginRight: '0.25em' }}
                                >
                                    {word}
                                </motion.span>
                            ))}{' '}
                            <span className={styles.heroTitleItalic}>
                                <span className={styles.wordRotator}>
                                    <AnimatePresence mode="wait">
                                        <motion.span
                                            key={wordIndex}
                                            className={styles.rotatingWord}
                                            initial={{ y: 40, opacity: 0, filter: 'blur(8px)' }}
                                            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                                            exit={{ y: -40, opacity: 0, filter: 'blur(8px)' }}
                                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                        >
                                            {ROTATING_WORDS[wordIndex]}
                                        </motion.span>
                                    </AnimatePresence>
                                </span>
                                <motion.svg
                                    className={styles.scribbleUnderline}
                                    viewBox="0 0 200 20"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={{ duration: 1.5, delay: 1, ease: 'easeOut' }}
                                    preserveAspectRatio="none"
                                >
                                    <path d="M5 15 Q 50 2, 100 12 T 195 8" fill="none" stroke="var(--color-mint)" strokeWidth="6" strokeLinecap="round" />
                                </motion.svg>
                            </span>
                        </motion.h1>

                        <motion.p className={styles.heroSubtitle} variants={fadeInUp}>
                            Discover hackathons, join clubs, find teammates, and never miss
                            what&apos;s happening on campus again.
                        </motion.p>

                        <motion.div variants={fadeInUp}>
                            <Link href="/events" className={styles.heroCta}>
                                Get Started Free
                                <motion.svg
                                    width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                    initial={{ x: 0 }}
                                    whileHover={{ x: 4 }}
                                >
                                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                                </motion.svg>
                            </Link>
                        </motion.div>
                    </motion.div>

                    {/* Artistic Hero Composition */}
                    <div className={styles.heroComposition}>
                        {/* Main Centerpiece Image */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, rotateY: 15 }}
                            animate={{ opacity: 1, scale: 1, y: [0, -15, 0], rotateY: 0 }}
                            transition={{
                                opacity: { duration: 1.2, ease: 'easeOut' },
                                scale: { duration: 1.2, ease: 'easeOut' },
                                rotateY: { duration: 1.2, ease: 'easeOut' },
                                y: { duration: 8, repeat: Infinity, ease: 'easeInOut' }
                            }}
                            style={{
                                position: 'relative', width: '100%', maxWidth: '440px',
                                aspectRatio: '4/5', zIndex: 2, margin: '0 auto',
                                y: heroImageY
                            }}
                        >
                            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                <Image
                                    src="/image.png"
                                    alt="Student life"
                                    fill
                                    style={{ objectFit: 'contain', filter: 'drop-shadow(0 20px 40px rgba(15, 31, 28, 0.15))' }}
                                    priority
                                />
                            </div>
                        </motion.div>

                        {/* Floating Glass Widget 1 - Left */}
                        <motion.div
                            className={`${styles.premiumGlassCard} ${styles.floatingWidget1}`}
                            initial={{ opacity: 0, x: -60, y: 40, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, x: 0, y: [0, 15, 0], filter: 'blur(0px)' }}
                            transition={{
                                opacity: { duration: 1, delay: 0.6, ease: 'easeOut' },
                                filter: { duration: 1, delay: 0.6, ease: 'easeOut' },
                                x: { duration: 1, delay: 0.6, ease: 'easeOut' },
                                y: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }
                            }}
                            whileHover={{ scale: 1.05, rotateY: 5, rotateX: -3 }}
                        >
                            <div className={styles.widgetIcon} style={{ background: 'var(--color-mint)', color: 'var(--color-forest)' }}>💡</div>
                            <div>
                                <h4 className={styles.widgetTitle}>Smart Matching</h4>
                                <p className={styles.widgetSub}>AI-driven team finder</p>
                            </div>
                        </motion.div>

                        {/* Floating Glass Widget 2 - Right */}
                        <motion.div
                            className={`${styles.premiumGlassCard} ${styles.floatingWidget2}`}
                            initial={{ opacity: 0, x: 60, y: -40, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, x: 0, y: [0, -20, 0], filter: 'blur(0px)' }}
                            transition={{
                                opacity: { duration: 1, delay: 0.8, ease: 'easeOut' },
                                filter: { duration: 1, delay: 0.8, ease: 'easeOut' },
                                x: { duration: 1, delay: 0.8, ease: 'easeOut' },
                                y: { duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }
                            }}
                            whileHover={{ scale: 1.05, rotateY: -5, rotateX: 3 }}
                        >
                            <div className={styles.widgetAvatarGroup}>
                                <div className={styles.widgetAvatar} style={{ background: '#FF7D5D', zIndex: 3 }} />
                                <div className={styles.widgetAvatar} style={{ background: '#B8E8D0', marginLeft: '-12px', zIndex: 2 }} />
                                <div className={styles.widgetAvatar} style={{ background: '#E0C0F8', marginLeft: '-12px', zIndex: 1 }} />
                            </div>
                            <div>
                                <h4 className={styles.widgetTitle}>12k+ Students</h4>
                                <p className={styles.widgetSub}>Active right now</p>
                            </div>
                        </motion.div>

                        {/* Decorative Graphic Elements */}
                        <motion.div
                            className={styles.heroGraphicCircle}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1, rotate: 360 }}
                            transition={{
                                opacity: { duration: 1.5, delay: 0.4 },
                                scale: { duration: 1.5, delay: 0.4, ease: 'easeOut' },
                                rotate: { duration: 40, repeat: Infinity, ease: 'linear' }
                            }}
                        >
                            <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: 'visible' }}>
                                <defs>
                                    <path id="circlePath" d="M 50, 50 m -45, 0 a 45,45 0 1,1 90,0 a 45,45 0 1,1 -90,0" fill="none" />
                                </defs>
                                <text fontSize="8.5" fill="var(--color-forest)" opacity="0.4" letterSpacing="0.25em" fontWeight="600" fontFamily="var(--font-sans)">
                                    <textPath href="#circlePath" startOffset="0%">
                                        DISCOVER · CONNECT · BUILD · PREMIER CAMPUS PLATFORM ·
                                    </textPath>
                                </text>
                            </svg>
                        </motion.div>
                    </div>
                </section>

                {/* Scroll Indicator */}
                <motion.div
                    className={styles.scrollIndicator}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2, duration: 0.8 }}
                    style={{ opacity: scrollIndicatorOpacity }}
                >
                    <span className={styles.scrollText}>Scroll to explore</span>
                    <motion.svg
                        className={styles.scrollChevron}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="6 9 12 15 18 9" />
                    </motion.svg>
                </motion.div>
            </div>

            {/* ═══ § 2 : SOCIAL PROOF STRIP ══════════════════════════════════ */}
            <section className={styles.socialProof}>
                <motion.div
                    className={styles.socialProofInner}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-80px' }}
                    variants={stagger}
                >
                    {[
                        { value: 12000, suffix: '+', label: 'Students' },
                        { value: 340, suffix: '+', label: 'Clubs' },
                        { value: 50, suffix: '+', label: 'Colleges' },
                        { value: 1200, suffix: '+', label: 'Events' },
                    ].map((stat) => (
                        <motion.div key={stat.label} className={styles.statBlock} variants={fadeInUp}>
                            <span className={styles.statNumber}>
                                <AnimatedCounter to={stat.value} suffix={stat.suffix} duration={1.5} />
                            </span>
                            <span className={styles.statLabel}>{stat.label}</span>
                        </motion.div>
                    ))}
                </motion.div>
            </section>

            {/* ═══ § 3 : BENTO GRID ═════════════════════════════════════════ */}
            <section className={styles.bentoSection}>
                <motion.div
                    className={styles.bentoHeader}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={stagger}
                >
                    <motion.h2 className={styles.bentoTitle} variants={fadeInUp}>
                        Everything happening, at a glance
                    </motion.h2>
                    <motion.p className={styles.bentoSubtitle} variants={fadeInUp}>
                        Events, clubs, teams — all in one place.
                    </motion.p>
                </motion.div>

                <motion.div
                    className={styles.bentoGrid}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-60px' }}
                    variants={stagger}
                >
                    {/* Featured event — large tile */}
                    <motion.div
                        className={styles.bentoFeatured}
                        variants={fadeInUp}
                        onMouseMove={handleFeaturedMouseMove}
                        onMouseLeave={handleFeaturedMouseLeave}
                        style={{ perspective: 1000 }}
                    >
                        <motion.div
                            className={styles.bentoFeaturedImage}
                            style={{
                                x: springFeaturedX,
                                y: springFeaturedY,
                                scale: 1.05
                            }}
                        >
                            <Image
                                src={displayCards[0]?.image || CARD_IMAGES[0]}
                                alt="Featured Event"
                                fill
                                style={{ objectFit: 'cover' }}
                                unoptimized
                            />
                        </motion.div>
                        <div className={styles.bentoFeaturedOverlay} />
                        <div className={styles.bentoFeaturedContent}>
                            <span className={styles.bentoFeaturedBadge}>Featured Event</span>
                            <h3 className={styles.bentoFeaturedTitle}>{displayCards[0]?.title || 'Annual Hackathon 2026'}</h3>
                            <p className={styles.bentoFeaturedMeta}>{displayCards[0]?.meta || 'Mar 15'} · Open Registration</p>
                            <Link href="/events" className={styles.heroCta} style={{ marginTop: '1.25rem', padding: '0.75rem 1.75rem', fontSize: '0.95rem' }}>
                                View Details
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                                </svg>
                            </Link>
                        </div>
                    </motion.div>

                    {/* Activity feed tile */}
                    <motion.div className={styles.bentoActivity} variants={fadeInUp}>
                        <span className={styles.bentoTileLabel}>
                            <span className={styles.livePulse} />
                            Live Activity
                        </span>
                        <div className={styles.activityList}>
                            {ACTIVITY_FEED.slice(0, 5).map((item, i) => (
                                <motion.div
                                    key={i}
                                    className={styles.activityItem}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                >
                                    <span className={styles.activityDot} style={{ backgroundColor: item.color }} />
                                    <span>{item.emoji} {item.text}</span>
                                    <span className={styles.activityTime}>{item.time}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Stat tile with sparkline */}
                    <motion.div className={styles.bentoStat} variants={fadeInUp}>
                        <div>
                            <span className={styles.bentoStatNumber}>
                                <AnimatedCounter to={147} duration={1.2} />
                            </span>
                            <p className={styles.bentoStatLabel}>events this month</p>
                        </div>
                        <div className={styles.bentoStatBadge}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                                <polyline points="17 6 23 6 23 12" />
                            </svg>
                            +23% this week
                        </div>
                        <Sparkline />
                    </motion.div>
                </motion.div>
            </section>

            {/* ═══ § 4 : SMART MATCHING ═══════════════════════════════════════ */}
            <section className={styles.matchSection}>
                {/* Visual — phone mockup */}
                <motion.div
                    className={styles.matchVisual}
                    initial={{ opacity: 0, scale: 0.92 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                >
                    <div className={styles.matchPhone}>
                        <div className={styles.matchPhoneNotch} />
                        <div className={styles.matchBubble}>
                            &ldquo;Hey, I see you&apos;re interested in <strong>React</strong> and
                            looking for a <strong>Hackathon</strong> team?&rdquo;
                            <span className={styles.typingCursor} />
                        </div>
                        <div className={styles.matchReply}>
                            Let&apos;s connect! 🚀
                        </div>
                    </div>

                    {/* Floating tags */}
                    <motion.div
                        className={styles.matchTag}
                        style={{ top: '15%', right: '5%', background: 'var(--color-lilac)', color: 'var(--color-forest)' }}
                        animate={{ y: [0, -15, 0], rotate: [0, 2, -1, 0] }}
                        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        Frontend Dev
                    </motion.div>
                    <motion.div
                        className={styles.matchTag}
                        style={{ bottom: '20%', left: '2%', background: 'var(--color-mint)', color: 'var(--color-forest)' }}
                        animate={{ y: [0, 12, 0], rotate: [0, -2, 1, 0] }}
                        transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                    >
                        UI/UX Designer
                    </motion.div>
                    <motion.div
                        className={styles.matchTag}
                        style={{ top: '60%', right: '0%', background: 'var(--color-orange)', color: '#fff' }}
                        animate={{ y: [0, -10, 0], x: [0, 5, 0], rotate: [0, 1, -1, 0] }}
                        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                    >
                        React Native
                    </motion.div>
                </motion.div>

                {/* Text content */}
                <motion.div
                    className={styles.matchContent}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={stagger}
                >
                    <motion.div className={styles.matchStat} variants={fadeInUp}>
                        ✦ 87% find a team in 24 hours
                    </motion.div>
                    <motion.h2 className={styles.matchTitle} variants={fadeInUp}>
                        Smart Matching
                    </motion.h2>
                    <motion.p className={styles.matchDesc} variants={fadeInUp}>
                        Stop guessing. Our intelligent algorithm connects you with the right
                        people based on your skills, interests, and college verification.
                        It&apos;s networking, <em style={{ fontFamily: 'var(--font-serif)' }}>refined</em>.
                    </motion.p>
                    <motion.div className={styles.matchActions} variants={fadeInUp}>
                        <Link href="/clubs" className="btn btn-primary">Find a Club</Link>
                        <Link href="/events" className="btn btn-outline">Browse Events</Link>
                    </motion.div>
                </motion.div>
            </section>

            {/* ═══ § 5 : TESTIMONIALS (Dual Marquee) ═════════════════════════ */}
            <section className={styles.testimonialsSection}>
                <motion.div
                    className={styles.testimonialHeader}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <h2 className={styles.testimonialTitle}>
                        Loved by students<br />everywhere
                    </h2>
                    <p className={styles.testimonialSubtitle}>
                        Don&apos;t take our word for it — hear from the community.
                    </p>
                </motion.div>

                {/* Row 1 — scrolls left */}
                <div className={styles.marqueeRow}>
                    <div className={styles.marqueeTrack}>
                        {[...TESTIMONIALS_ROW_1, ...TESTIMONIALS_ROW_1].map((t, i) => (
                            <div key={`r1-${i}`} className={styles.testimonialCard}>
                                <StarRating count={t.stars} />
                                <p className={styles.quoteText}>&ldquo;{t.text}&rdquo;</p>
                                <div className={styles.userProfile}>
                                    <div className={styles.userAvatar} style={{ background: `hsl(${i * 45}, 70%, 78%)` }} />
                                    <div className={styles.userInfo}>
                                        <h4>{t.author}</h4>
                                        <span>{t.role}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Row 2 — scrolls right */}
                <div className={styles.marqueeRow}>
                    <div className={styles.marqueeTrackReverse}>
                        {[...TESTIMONIALS_ROW_2, ...TESTIMONIALS_ROW_2].map((t, i) => (
                            <div key={`r2-${i}`} className={styles.testimonialCard}>
                                <StarRating count={t.stars} />
                                <p className={styles.quoteText}>&ldquo;{t.text}&rdquo;</p>
                                <div className={styles.userProfile}>
                                    <div className={styles.userAvatar} style={{ background: `hsl(${i * 55 + 20}, 65%, 75%)` }} />
                                    <div className={styles.userInfo}>
                                        <h4>{t.author}</h4>
                                        <span>{t.role}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ § 6 : FINAL CTA ═══════════════════════════════════════════ */}
            <section className={styles.ctaSection}>
                <div className={styles.ctaGlow} />
                <motion.div
                    className={styles.ctaContent}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                >
                    <h2 className={styles.ctaTitle}>
                        Ready to <span className={styles.ctaTitleGradient}>connect</span>?
                    </h2>
                    <p className={styles.ctaSubtitle}>
                        Join thousands of students building the future.
                        <br />
                        All capabilities included. No credit card needed.
                    </p>
                    <Link href="/events" className={styles.ctaButton}>
                        Join 12,000+ Students
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                        </svg>
                    </Link>
                </motion.div>
            </section>
        </div>
    );
}
