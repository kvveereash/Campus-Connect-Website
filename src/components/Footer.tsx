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
                        <li><Link href="#">About Us</Link></li>
                        <li><Link href="#">Partner with Us</Link></li>
                        <li><Link href="#">Guidelines</Link></li>
                    </ul>
                </div>

                <div className={styles.column}>
                    <h4 className={styles.heading}>Connect</h4>
                    <ul className={styles.links}>
                        <li><Link href="#">Twitter</Link></li>
                        <li><Link href="#">LinkedIn</Link></li>
                        <li><Link href="#">Instagram</Link></li>
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
