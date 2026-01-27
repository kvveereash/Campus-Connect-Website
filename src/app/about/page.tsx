import styles from './page.module.css';

export default function AboutPage() {
    return (
        <div className={styles.container}>
            {/* Hero */}
            <section className={styles.hero}>
                <h1 className={styles.heroTitle}>We fit the <br /> <span className={styles.highlight}>puzzle</span>.</h1>
                <p className={styles.heroSubtitle}>
                    Campus Connect is the missing piece in your university life.
                    We bridge the gap between students, clubs, and opportunities.
                </p>
            </section>

            {/* Ticker Tape */}
            <div className={styles.tickerWrapper}>
                <div className={styles.tickerContent}>
                    <span className={styles.tickerItem}>COMMUNITY</span>
                    <span className={styles.tickerItem}>INNOVATION</span>
                    <span className={styles.tickerItem}>GROWTH</span>
                    <span className={styles.tickerItem}>COLLABORATION</span>
                    <span className={styles.tickerItem}>•</span>
                    <span className={styles.tickerItem}>COMMUNITY</span>
                    <span className={styles.tickerItem}>INNOVATION</span>
                    <span className={styles.tickerItem}>GROWTH</span>
                    <span className={styles.tickerItem}>COLLABORATION</span>
                </div>
                {/* Duplicate for seamless loop */}
                <div className={styles.tickerContent}>
                    <span className={styles.tickerItem}>COMMUNITY</span>
                    <span className={styles.tickerItem}>INNOVATION</span>
                    <span className={styles.tickerItem}>GROWTH</span>
                    <span className={styles.tickerItem}>COLLABORATION</span>
                    <span className={styles.tickerItem}>•</span>
                    <span className={styles.tickerItem}>COMMUNITY</span>
                    <span className={styles.tickerItem}>INNOVATION</span>
                    <span className={styles.tickerItem}>GROWTH</span>
                    <span className={styles.tickerItem}>COLLABORATION</span>
                </div>
            </div>

            {/* Manifesto TEXT - Replaced with Philosophy */}
            <section className={styles.manifestoSection}>
                <p className={styles.manifestoText}>
                    <span className={styles.highlight}>Universities are chaotic.</span> <br />
                    Thousands of students, hundreds of clubs, endless events.
                    It's easy to get lost in the noise.
                    <br /><br />
                    Campus Connect cuts through the clutter. We are the operating system
                    for your campus life—a single, beautiful space where
                    <span className={styles.highlight}> clarity meets community</span>.
                </p>
            </section>

            {/* Values / How it Works */}
            <section className={styles.valuesSection}>
                <div className={styles.valueGrid}>
                    <div className={styles.valueCard}>
                        <h3 className={styles.valueTitle}>01. Discover</h3>
                        <p className={styles.valueDesc}>
                            No more WhatsApp spam. Find events, hackathons, and clubs
                            in a unified, searchable feed powered by real-time updates.
                        </p>
                    </div>
                    <div className={styles.valueCard}>
                        <h3 className={styles.valueTitle}>02. Connect</h3>
                        <p className={styles.valueDesc}>
                            Find your tribe. Whether you're a coder, artist, or organizer,
                            smart filtering helps you meet the right people.
                        </p>
                    </div>
                    <div className={styles.valueCard}>
                        <h3 className={styles.valueTitle}>03. Lead</h3>
                        <p className={styles.valueDesc}>
                            Tools for leaders. Manage registrations, track analytics,
                            and grow your community with professional-grade admin tools.
                        </p>
                    </div>
                </div>
            </section>

            {/* Team / Credits */}
            <section className={styles.teamSection}>
                <div className={styles.teamHeader}>
                    <h2 className={styles.sectionTitle}>Built with <span style={{ fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>intent</span>.</h2>
                    <p style={{ maxWidth: '600px', margin: '0 auto', color: 'var(--text-secondary)' }}>
                        Crafted by students who wanted more from their campus experience.
                    </p>
                </div>

                <div className={styles.teamGrid}>
                    <div className={styles.teamCard}>
                        <div className={styles.avatar} style={{ background: 'linear-gradient(135deg, #0F1F1C 0%, #475569 100%)' }}></div>
                        <h3 className={styles.memberName}>Engineering</h3>
                        <span className={styles.memberRole}>Building the Foundation</span>
                    </div>
                    <div className={styles.teamCard}>
                        <div className={styles.avatar} style={{ background: 'linear-gradient(135deg, #FF7D5D 0%, #E0C0F8 100%)' }}></div>
                        <h3 className={styles.memberName}>Community</h3>
                        <span className={styles.memberRole}>Driving the Culture</span>
                    </div>
                </div>
            </section>
        </div>
    );
}
