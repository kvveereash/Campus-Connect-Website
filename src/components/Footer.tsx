import Link from 'next/link';
import { T } from '@/lib/i18n';
import LanguagePicker from './LanguagePicker';
import styles from './Footer.module.css';

const COLUMNS = [
    {
        heading: 'footer.find',
        links: [
            { href: '/events', label: 'nav.events' },
            { href: '/fests', label: 'nav.fests' },
            { href: '/clubs', label: 'nav.clubs' },
            { href: '/colleges', label: 'nav.colleges' },
            { href: '/map', label: 'nav.venues' },
        ],
    },
    {
        heading: 'footer.takePart',
        links: [
            { href: '/team-finder', label: 'nav.teamFinder' },
            { href: '/buzz', label: 'nav.clubPosts' },
            { href: '/leaderboards', label: 'nav.leaderboard' },
            { href: '/events/create', label: 'footer.hostEvent' },
        ],
    },
    {
        heading: 'footer.about',
        links: [
            { href: '/about', label: 'footer.aboutUs' },
            { href: '/legal/guidelines', label: 'footer.guidelines' },
            { href: '/legal/refunds', label: 'footer.refunds' },
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
                                <T k="footer.tagline" />
                            </p>
                            <Link href="/signup" className={styles.cta}>
                                <T k="footer.join" />
                            </Link>
                        </div>

                        <div className={styles.columns}>
                            {COLUMNS.map((col) => (
                                <div key={col.heading} className={styles.column}>
                                    <h2 className={styles.heading}>
                                        <T k={col.heading} />
                                    </h2>
                                    <ul className={styles.links}>
                                        {col.links.map((l) => (
                                            <li key={l.href}>
                                                <Link href={l.href}>
                                                    <T k={l.label} />
                                                </Link>
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
                            <Link href="/legal/privacy"><T k="footer.privacy" /></Link>
                            <Link href="/legal/terms"><T k="footer.terms" /></Link>
                            <Link href="/legal/guidelines"><T k="footer.guidelinesShort" /></Link>
                            <Link href="/legal/refunds"><T k="footer.refundsShort" /></Link>
                            <Link href="/legal/credits"><T k="footer.credits" /></Link>
                        </nav>
                        <LanguagePicker />
                    </div>
                </div>
            </div>
        </footer>
    );
}
