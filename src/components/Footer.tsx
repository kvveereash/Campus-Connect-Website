import Link from 'next/link';
import styles from './Footer.module.css';

const COLUMNS = [
    {
        heading: 'Find',
        links: [
            { href: '/events', label: 'Events' },
            { href: '/clubs', label: 'Clubs' },
            { href: '/colleges', label: 'Colleges' },
            { href: '/map', label: 'Venues' },
        ],
    },
    {
        heading: 'Take part',
        links: [
            { href: '/team-finder', label: 'Team finder' },
            { href: '/buzz', label: 'Buzz' },
            { href: '/leaderboards', label: 'Leaderboard' },
            { href: '/events/create', label: 'Host an event' },
        ],
    },
    {
        heading: 'About',
        links: [
            { href: '/about', label: 'About us' },
            { href: '/legal/guidelines', label: 'Community guidelines' },
            { href: '/legal/refunds', label: 'Ticket refunds' },
        ],
    },
] as const;

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={`container ${styles.footerContainer}`}>
                <div className={styles.sheet}>
                    <div className={styles.top}>
                        <div className={styles.intro}>
                            <p className={styles.tagline}>
                                Every fest, hackathon, workshop and club across campus, on one board.
                            </p>
                            <Link href="/signup" className={styles.cta}>
                                Join free
                            </Link>
                        </div>

                        <div className={styles.columns}>
                            {COLUMNS.map((col) => (
                                <div key={col.heading} className={styles.column}>
                                    <h2 className={styles.heading}>{col.heading}</h2>
                                    <ul className={styles.links}>
                                        {col.links.map((l) => (
                                            <li key={l.href}>
                                                <Link href={l.href}>{l.label}</Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className={styles.wordmark} aria-hidden="true">
                        Campus Connect
                    </p>

                    <div className={styles.bottomBar}>
                        <p suppressHydrationWarning>&copy; {new Date().getFullYear()} Campus Connect</p>
                        <nav className={styles.legalLinks} aria-label="Policies">
                            <Link href="/legal/privacy">Privacy</Link>
                            <Link href="/legal/terms">Terms</Link>
                            <Link href="/legal/guidelines">Guidelines</Link>
                            <Link href="/legal/refunds">Refunds</Link>
                            <Link href="/legal/credits">Credits</Link>
                        </nav>
                    </div>
                </div>
            </div>
        </footer>
    );
}
