import { Metadata } from 'next';
import { getSessionUser, getRecommendedTeammates } from '@/lib/actions'; // These will fail if prisma fetch failed, but we handle it
import styles from './page.module.css';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Find Teammates | Campus Connect',
    description: 'Find the perfect teammates for your next hackathon or project using AI matchmaking.',
};

export default async function TeamFinderPage() {
    const user = await getSessionUser();

    if (!user) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyState}>
                    <h2>Please Login first</h2>
                    <p style={{ margin: '1rem 0' }}>You need to be logged in to find teammates.</p>
                    <Link href="/login" className="btn btn-primary">Login Now</Link>
                </div>
            </div>
        );
    }

    // Fetch Matches
    // Note: If prisma client is outdated, this functions might throw, we should catch inside actions ideally, 
    // but here we can try-catch too just in case.
    let matches: any[] = [];
    try {
        matches = await getRecommendedTeammates(user.id);
    } catch (e) {
        console.error("Match fetch error", e);
    }

    const hasSkills = user.skills && user.skills.length > 0;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>AI Team Matchmaker 🧠</h1>
                <p className={styles.subtitle}>
                    We analyzed your skills and interests to find these perfect teammates for your next project.
                </p>
            </header>

            {!hasSkills && (
                <div style={{
                    background: 'rgba(234, 179, 8, 0.1)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    marginBottom: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                        <div>
                            <h4 style={{ color: '#facc15', margin: 0 }}>Improve your matches!</h4>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                You haven't added any skills to your profile yet. Add them to get better recommendations.
                            </p>
                        </div>
                    </div>
                    <Link href="/profile" className="btn btn-outline" style={{ fontSize: '0.9rem' }}>
                        Update Profile
                    </Link>
                </div>
            )}

            <section className={styles.section}>
                <div className={styles.sectionTitle}>
                    <span>⚡</span> Recommended for You
                </div>

                {matches.length > 0 ? (
                    <div className={styles.grid}>
                        {matches.map((match) => (
                            <div key={match.id} className={styles.matchCard}>
                                <div className={styles.matchScore}>
                                    <span>🔥</span> {Math.min(match.matchScore, 100)}% Match
                                </div>

                                <div className={styles.avatar}>
                                    {match.avatar}
                                </div>

                                <div className={styles.userInfo}>
                                    <h3 className={styles.userName}>{match.name}</h3>
                                    <p className={styles.userDept}>{match.department} • {match.year}</p>
                                </div>

                                <div className={styles.skillsContainer}>
                                    {match.skills.slice(0, 4).map((skill: string) => (
                                        <span key={skill} className={styles.skillTag}>
                                            {skill}
                                        </span>
                                    ))}
                                    {match.skills.length > 4 && (
                                        <span className={styles.skillTag}>+{match.skills.length - 4}</span>
                                    )}
                                </div>

                                {match.matchReasons.length > 0 && (
                                    <div className={styles.reasonsList}>
                                        {match.matchReasons.map((reason: string, idx: number) => (
                                            <div key={idx} className={styles.reasonItem}>
                                                <span>✓</span> {reason}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <button className={styles.connectBtn}>
                                    Connect
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖</div>
                        <h3>No matches found yet</h3>
                        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
                            We couldn't find any strong matches. Try adding more interests or skills to your profile to help our AI find your tribe.
                        </p>
                        <Link href="/profile" className="btn btn-primary">
                            Update My Profile
                        </Link>
                    </div>
                )}
            </section>
        </div>
    );
}
