'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import EventCard from '@/components/EventCard';
import EventCardSkeleton from '@/components/EventCardSkeleton';
import FloatingParticles from '@/components/FloatingParticles';
import styles from './page.module.css';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { EventWithRelations } from '@/lib/actions';

interface LandingClientProps {
    initialEvents: EventWithRelations[];
}

export default function LandingClient({ initialEvents }: LandingClientProps) {
    const events = initialEvents;
    const isLoading = false; // Data is pre-fetched on server
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Animation variants
    const fadeInUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    // Parallax logic

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const springConfig = { damping: 25, stiffness: 700 };
    const mouseXSpring = useSpring(mouseX, springConfig);
    const mouseYSpring = useSpring(mouseY, springConfig);

    const xBack = useTransform(mouseXSpring, [-1, 1], [30, -30]);
    const yBack = useTransform(mouseYSpring, [-1, 1], [30, -30]);

    const xMain = useTransform(mouseXSpring, [-1, 1], [-10, 10]);
    const yMain = useTransform(mouseYSpring, [-1, 1], [-10, 10]);

    const xFront = useTransform(mouseXSpring, [-1, 1], [-60, 60]);
    const yFront = useTransform(mouseYSpring, [-1, 1], [-60, 60]);

    return (
        <div className={styles.container} data-theme={mounted ? "light" : undefined}>
            {/* Hero Section */}
            <section
                className={styles.hero}
                onMouseMove={(e) => {
                    const { clientX, clientY } = e;
                    const centerX = window.innerWidth / 2;
                    const centerY = window.innerHeight / 2;
                    // Move values between -1 and 1
                    mouseX.set((clientX - centerX) / centerX);
                    mouseY.set((clientY - centerY) / centerY);
                }}
            >
                {/* Floating Animated Particles */}
                <FloatingParticles count={30} />
                <motion.div
                    className={styles.heroContent}
                    initial="hidden"
                    animate="visible"
                    variants={staggerContainer}
                >
                    <motion.h1 className={styles.heroTitle} variants={fadeInUp}>
                        Connect, Collaborate, and <span className={styles.highlight}>Create</span>
                    </motion.h1>
                    <motion.p className={styles.heroSubtitle} variants={fadeInUp}>
                        The ultimate platform for students to discover hackathons, fests, and
                        workshops across campuses. Join the community today.
                    </motion.p>
                    <motion.div className={styles.ctaGroup} variants={fadeInUp}>
                        <Link href="/events" className="btn btn-primary">
                            Explore Events
                        </Link>
                        <Link href="/colleges" className="btn btn-outline">
                            Find Colleges
                        </Link>
                    </motion.div>
                </motion.div>

                {/* Parallax Image Wrapper */}
                <div className={styles.heroImageWrapper}>
                    {/* Back Layer - Abstract Graphic (Moves Opposite) */}
                    <motion.div
                        style={{ x: xBack, y: yBack, position: 'absolute', zIndex: 0, opacity: 0.6 }}
                        className={styles.parallaxBack}
                    >
                        <svg width="400" height="400" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                            <path fill="#2E865F" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-4.9C93.5,9.3,82.2,22.9,71.3,34.8C60.4,46.7,49.9,56.9,37.8,65.3C25.7,73.8,12,80.5,-0.8,81.9C-13.6,83.3,-26.2,79.4,-37.8,72.4C-49.4,65.4,-60,55.3,-68.8,43.4C-77.6,31.5,-84.6,17.8,-83.9,4.4C-83.2,-9,-74.8,-22.1,-64.8,-32.8C-54.8,-43.5,-43.2,-51.8,-31.2,-60.3C-19.2,-68.8,-6.8,-77.5,7.2,-89.9L44.7,-76.4Z" transform="translate(100 100)" />
                        </svg>
                    </motion.div>

                    {/* Main Layer - Campus Image (Moves Slightly) */}
                    <motion.div
                        style={{ x: xMain, y: yMain, zIndex: 1, position: 'relative' }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        <Image
                            src="/hero.png"
                            alt="Campus Life"
                            width={600}
                            height={400}
                            className={styles.heroImage}
                            priority
                        />
                    </motion.div>

                    {/* Front Layer - Floating Elements (Moves With Mouse, Fast) */}
                    <motion.div
                        style={{ x: xFront, y: yFront, position: 'absolute', top: '-10%', right: '-5%', zIndex: 2 }}
                        className={styles.floatElement1}
                    >
                        <div style={{ background: 'white', padding: '1rem', borderRadius: '1rem', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                            <span style={{ fontSize: '2rem' }}>🚀</span>
                        </div>
                    </motion.div>

                    <motion.div
                        style={{ x: xFront, y: yFront, position: 'absolute', bottom: '10%', left: '-10%', zIndex: 2 }}
                        className={styles.floatElement2}
                    >
                        <div style={{ background: 'white', padding: '1rem', borderRadius: '1rem', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                            <span style={{ fontSize: '2rem' }}>🎨</span>
                        </div>
                    </motion.div>
                </div>
            </section>



            {/* Ticker Tape */}
            <div className={styles.tickerWrapper}>
                <div className={styles.tickerContent}>
                    <span className={styles.tickerItem}>TRUSTED BY <span style={{ opacity: 0.5 }}>MIT</span></span>
                    <span className={styles.tickerItem}>•</span>
                    <span className={styles.tickerItem}>INTEGRATED WITH <span style={{ opacity: 0.5 }}>GITHUB</span></span>
                    <span className={styles.tickerItem}>•</span>
                    <span className={styles.tickerItem}>LIVE ON <span style={{ opacity: 0.5 }}>CAMPUS</span></span>
                    <span className={styles.tickerItem}>•</span>
                    <span className={styles.tickerItem}>POWERED BY <span style={{ opacity: 0.5 }}>AI</span></span>
                    <span className={styles.tickerItem}>•</span>
                    <span className={styles.tickerItem}>TRUSTED BY <span style={{ opacity: 0.5 }}>MIT</span></span>
                    <span className={styles.tickerItem}>•</span>
                    <span className={styles.tickerItem}>INTEGRATED WITH <span style={{ opacity: 0.5 }}>GITHUB</span></span>
                    <span className={styles.tickerItem}>•</span>
                    <span className={styles.tickerItem}>LIVE ON <span style={{ opacity: 0.5 }}>CAMPUS</span></span>
                    <span className={styles.tickerItem}>•</span>
                    <span className={styles.tickerItem}>POWERED BY <span style={{ opacity: 0.5 }}>AI</span></span>
                    <span className={styles.tickerItem}>•</span>
                </div>
            </div>

            {/* Upcoming Events Section (Dynamic) */}
            {
                (events.length > 0) && (
                    <section className={styles.features}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2 className={styles.sectionTitle} style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', background: 'var(--surface-color)', borderRadius: '10px', color: 'var(--primary-color)' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                </span>
                                Upcoming Events
                            </h2>
                            <Link href="/events" style={{ color: 'var(--primary-color)', fontWeight: 500 }}>
                                View all →
                            </Link>
                        </div>
                        <motion.div
                            className={styles.featureGrid}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-100px" }}
                            variants={staggerContainer}
                        >
                            {isLoading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <EventCardSkeleton key={i} />
                                ))
                            ) : (
                                events.map((event, index) => (
                                    <motion.div key={event.id} variants={fadeInUp}>
                                        <EventCard event={event} index={index} />
                                    </motion.div>
                                ))
                            )}
                        </motion.div>
                    </section>
                )
            }

            {/* --- Comparison Section (Manual vs Platform) --- */}
            <section className={styles.comparisonSection}>
                <div className={styles.comparisonGrid}>
                    {/* Left: Old Way */}
                    <motion.div
                        className={styles.comparisonCardStatic}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <span className={styles.comparisonLabel}>Manual Search</span>
                        <h3 className={styles.comparisonValue}>0 connections</h3>
                        <p className={styles.comparisonSub}>Endless scrolling through WhatsApp groups.</p>
                    </motion.div>

                    {/* Right: New Way (Video/Dynamic) */}
                    <motion.div
                        className={styles.comparisonCardDynamic}
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <div className={styles.imageBackgroundWrapper}>
                            <Image
                                src="/feature-community.png"
                                alt="Campus Community"
                                fill
                                style={{ objectFit: 'cover' }}
                                quality={100}
                            />
                            <div className={styles.imageOverlayGradient} />
                        </div>

                        {/* Content Overlay */}
                        <div className={styles.cardContentRelative}>
                            <span className={styles.comparisonLabel}>Campus Connect</span>
                            <h3 className={styles.comparisonValue}>500+ peers</h3>
                            <p className={styles.comparisonSub}>Instantly find teammates and events.</p>

                            <div className={styles.floatingBadge}>
                                <span className={styles.soundWave}>||||||</span> Live Updates
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* --- Feature Showcase (AI / Smart Match) --- */}
            <section className={styles.showcaseSection}>
                <div className={styles.showcaseGrid}>
                    {/* Left: Visual UI Mockup */}
                    <motion.div
                        className={styles.showcaseVisual}
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                    >
                        {/* Simulation of the 'AI Auto Edits' card from reference */}
                        <div className={styles.mockupCard}>
                            <div className={styles.mockupHeader}>
                                <span className={styles.mockupTag} style={{ background: '#FF7D5D', color: 'white', transform: 'rotate(-2deg)' }}>
                                    Match Found!
                                </span>
                            </div>
                            <div className={styles.mockupBody}>
                                <p className={styles.mockupText}>
                                    "Hey, I see you're interested in <strong>React</strong> and looking for a <strong>Hackathon</strong> team?"
                                </p>
                                <div className={styles.mockupReply}>
                                    <div className={styles.avatar} />
                                    <span>Let's connect! 🚀</span>
                                </div>
                            </div>
                            {/* Floating elements */}
                            <div className={styles.floatTag} style={{ top: '20%', right: '-10px' }}>Frontend Dev</div>
                            <div className={styles.floatTag} style={{ bottom: '20%', left: '-10px' }}>UI/UX Designer</div>
                        </div>
                    </motion.div>

                    {/* Right: Text Content */}
                    <div className={styles.showcaseContent}>
                        <div className={styles.scribbleIcon}>
                            <svg width="60" height="60" viewBox="0 0 100 100" fill="none" stroke="var(--color-orange)" strokeWidth="3">
                                <path d="M50 20 Q 60 10, 70 20 T 90 20 M 50 80 Q 40 90, 30 80 T 10 80" opacity="0.5" />
                                <circle cx="50" cy="50" r="30" strokeDasharray="5,5" />
                                <path d="M50 20 L50 10 M50 80 L50 90 M20 50 L10 50 M80 50 L90 50" />
                            </svg>
                        </div>
                        <h2 className={styles.showcaseTitle}>Smart Matching</h2>
                        <p className={styles.showcaseDesc}>
                            Stop guessing. Our intelligent algorithm connects you with the right people
                            based on your skills, interests, and college verification.
                            It's networking, <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>refined</span>.
                        </p>
                        <div className={styles.showcaseActions}>
                            <Link href="/clubs" className="btn btn-primary">Find a Club</Link>
                            <Link href="/map" className="btn btn-outline">View Campus Map</Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Love Letters (Testimonials) Section --- */}
            <section className={styles.testimonialsSection}>
                <div className={styles.testimonialHeader}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        {/* Scribble decoration above title */}
                        <svg className={styles.scribbleIcon} width="100" height="40" viewBox="0 0 100 40" style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', opacity: 0.8 }}>
                            <path d="M10 20 Q 25 5, 50 20 T 90 20" fill="none" stroke="var(--color-lilac)" strokeWidth="2" />
                        </svg>
                        <h2 className={styles.testimonialTitle}>Love letters <br /> to Campus Connect</h2>
                    </div>
                </div>

                <div className={styles.testimonialScrollContainer}>
                    {[
                        { text: "I've been using Campus Connect almost every day. It's probably my favorite way to find hackathon teammates!", author: "Sarah Jenkins", role: "CS Student" },
                        { text: "I can make quick edits while speaking to it because flow really understands the context.", author: "Mike Chen", role: "Design Club Lead" },
                        { text: "This is the best AI product I've seen since ChatGPT. It actually helps me organize club events.", author: "Davide N.", role: "Event Organizer" },
                        { text: "Literally a game changer. Found 3 critical team members for our startup project in 24 hours.", author: "Jessica Lee", role: "Founder" },
                        { text: "The UI is just stunning. It feels like I'm using a premium tool, not just a college board.", author: "Alex R.", role: "UX Designer" },
                        { text: "Finally, a place where I can actually see what's happening on campus without checking 50 groups.", author: "Priya S.", role: "Student" },
                        { text: "Organizing the cultural fest was a breeze thanks to the event management tools here.", author: "Rahul M.", role: "Cultural Sec" },
                    ].map((item, i) => (
                        <div key={i} className={styles.testimonialCard}>
                            <p className={styles.quoteText}>"{item.text}"</p>
                            <div className={styles.userProfile}>
                                <div className={styles.userAvatar} style={{ background: `hsl(${i * 60}, 70%, 80%)` }} /> {/* Dynamic colors */}
                                <div className={styles.userInfo}>
                                    <h4>{item.author}</h4>
                                    <span>{item.role}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* --- Final CTA Section --- */}
            <section className={styles.finalCtaSection}>
                <div className={styles.imageBackgroundWrapper}>
                    <Image
                        src="/hero.png" // Reusing hero for aesthetic texture
                        alt="Background"
                        fill
                        style={{ objectFit: 'cover', opacity: 0.4 }}
                    />
                    <div className={styles.imageOverlayGradient} style={{ background: 'linear-gradient(to top, var(--color-forest), transparent)' }} />
                </div>

                <div className={styles.ctaContent}>
                    <h2 className={styles.ctaTitle}>Start connecting...</h2>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.2rem', marginBottom: '3rem', maxWidth: '500px', margin: '0 auto 3rem' }}>
                        Join thousands of students building the future. <br /> All capabilities included.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <Link href="/events" className="btn btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}>
                            Try Now
                        </Link>
                        <Link href="/about" className="btn btn-outline" style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                            Watch the Video
                        </Link>
                    </div>
                </div>

                {/* Decorative dashed line */}
                <svg className={styles.dashedLineCurve} viewBox="0 0 600 300">
                    <path d="M0 150 Q 150 50, 300 150 T 600 150" fill="none" stroke="var(--color-lilac)" strokeWidth="2" strokeDasharray="10 10" />
                </svg>
            </section>
        </div >
    );
}
