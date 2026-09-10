import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getLandingStats } from '@/lib/actions/landing';
import styles from './about.module.css';
import Reveal from '@/components/Reveal';

export const metadata: Metadata = {
    title: 'About',
    description:
        'What Campus Connect is, what it actually does, and what it is built with.',
};

const STEPS = [
    {
        title: 'Discover',
        body: 'Every verified event across campus in one list, grouped by when it happens rather than when it was posted.',
    },
    {
        title: 'Connect',
        body: 'Clubs with their own feed, members and events. Join one and its posts arrive in your Buzz.',
    },
    {
        title: 'Team up',
        body: 'Say what you are looking for before a hackathon and get matched with people whose skills fill the gaps.',
    },
];

const STACK = [
    'Next.js 16',
    'React 19',
    'TypeScript',
    'PostgreSQL',
    'Prisma',
    'Pusher',
    'Stripe',
    'Upstash Redis',
    'Jest',
];

export default async function AboutPage() {
    const stats = await getLandingStats();

    return (
        <div className={styles.page}>
            <p className={styles.label}>About</p>
            <h1 className={styles.lede}>
                Campus life is spread across forty group chats.
            </h1>

            <div className={styles.prose}>
                <p>
                    Events get announced in one place, clubs recruit in another, and the
                    people who would have joined never hear about either. Nothing is
                    missing exactly — it is just scattered, and scattered is the same as
                    invisible.
                </p>
                <p>
                    Campus Connect puts it in one feed. Every event, every club, every
                    college, in the order things are actually happening.
                </p>
            </div>

            {/* Real counts, or none. The same rule as the landing page: a
                figure that could not be measured is not zero. */}
            {stats.available && (
            <Reveal>
            <section className={styles.section}>
                <p className={styles.label}>Where it stands</p>
                <div className={styles.figures}>
                    <div className={styles.figure}>
                        <b>{String(stats.events).padStart(2, '0')}</b>
                        <span>Events</span>
                    </div>
                    <div className={styles.figure}>
                        <b>{String(stats.clubs).padStart(2, '0')}</b>
                        <span>Clubs</span>
                    </div>
                    <div className={styles.figure}>
                        <b>{String(stats.colleges).padStart(2, '0')}</b>
                        <span>Colleges</span>
                    </div>
                    <div className={styles.figure}>
                        <b>{String(stats.students).padStart(2, '0')}</b>
                        <span>Students</span>
                    </div>
                </div>
            </section>
            </Reveal>
            )}

            <Reveal>
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>What it does</h2>
                <div className={styles.steps}>
                    {STEPS.map((step, i) => (
                        <div key={step.title} className={styles.step}>
                            <span className={styles.stepNo}>
                                {String(i + 1).padStart(2, '0')}
                            </span>
                            <h3>{step.title}</h3>
                            <p>{step.body}</p>
                        </div>
                    ))}
                </div>
            </section>
            </Reveal>

            {/* The page previously credited "Engineering" and "Community" as though
                they were people. This is a student project with one author, and
                saying so plainly is both true and more interesting than a team grid
                of gradient circles. */}
            <Reveal>
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Who built it</h2>
                <div className={styles.prose}>
                    <p>
                        One student, as a portfolio project. Every event, club and profile
                        on the site is a real record in a real database — nothing here is
                        a mockup or a screenshot.
                    </p>
                    <p>
                        It runs custom JWT authentication, role-based access, an admin
                        verification queue, rate limiting, audit logging, real-time chat
                        and Stripe payments. <strong>Built with:</strong>
                    </p>
                </div>
                <div className={styles.stack} style={{ marginTop: 24 }}>
                    {STACK.map((tech) => (
                        <span key={tech} className={styles.chip}>
                            {tech}
                        </span>
                    ))}
                </div>
            </section>
            </Reveal>

            <Reveal>
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Have a look around.</h2>
                <div className={styles.actions}>
                    <Link href="/events" className={styles.pill}>
                        Browse events
                        <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                    <Link href="/clubs" className={styles.pill}>
                        Explore clubs
                    </Link>
                </div>
            </section>
            </Reveal>
        </div>
    );
}
