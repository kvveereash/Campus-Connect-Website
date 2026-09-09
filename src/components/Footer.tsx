import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={`container ${styles.footerContainer}`}>
                <div className={styles.column}>
                    <h3 className={styles.logo}>Campus Connect</h3>
                    <p className={styles.tagline}>
                        Bridging the gap between students, events, and opportunities.
                    </p>
                </div>

                <div className={styles.column}>
                    <h4 className={styles.heading}>Platform</h4>
                    <ul className={styles.links}>
                        <li><Link href="/events">Events</Link></li>
                        <li><Link href="/colleges">Colleges</Link></li>
                        <li><Link href="/profile">Profile</Link></li>
                    </ul>
                </div>

                <div className={styles.column}>
                    <h4 className={styles.heading}>Community</h4>
                    <ul className={styles.links}>
                        <li><Link href="/about">About Us</Link></li>
                        <li><Link href="/clubs">Browse Clubs</Link></li>
                        <li><Link href="/leaderboards">Leaderboards</Link></li>
                    </ul>
                </div>

                {/* The social column previously held three href="#" links to
                    accounts that do not exist. Pointing them at real pages
                    beats shipping links that go nowhere; swap in real profile
                    URLs once the accounts are created. */}
                <div className={styles.column}>
                    <h4 className={styles.heading}>Discover</h4>
                    <ul className={styles.links}>
                        <li><Link href="/team-finder">Find Teammates</Link></li>
                        <li><Link href="/map">Venues</Link></li>
                        <li><Link href="/buzz">Campus Buzz</Link></li>
                    </ul>
                </div>
            </div>

            <div className={styles.bottomBar}>
                <div className={`container ${styles.bottomBarContent}`}>
                    <p suppressHydrationWarning>&copy; {new Date().getFullYear()} Campus Connect. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
