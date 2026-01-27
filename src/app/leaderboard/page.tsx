import { getLeaderboard } from '@/lib/actions';
import styles from './page.module.css';

export default async function LeaderboardPage() {
    const leaderboard = await getLeaderboard();

    const topThree = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>🏆 Hall of Fame</h1>
                <p className={styles.subtitle}>Recognizing the most active students on Campus Connect</p>
            </header>

            {/* Podium for Top 3 */}
            <div className={styles.podiumContainer}>
                {topThree[1] && <PodiumUser user={topThree[1]} rank={2} />}
                {topThree[0] && <PodiumUser user={topThree[0]} rank={1} />}
                {topThree[2] && <PodiumUser user={topThree[2]} rank={3} />}
            </div>

            {/* Table for the rest */}
            {rest.length > 0 && (
                <div className={styles.tableContainer}>
                    <div className={styles.tableHeader}>
                        <div>Rank</div>
                        <div>Student</div>
                        <div>Badges</div>
                        <div style={{ textAlign: 'right' }}>Points</div>
                    </div>
                    {rest.map((user, index) => (
                        <div key={user.id} className={styles.tableRow}>
                            <div className={styles.rankCell}>#{index + 4}</div>
                            <div className={styles.userCell}>
                                <div className={styles.miniAvatar}>{user.avatar}</div>
                                <div className={styles.userInfo}>
                                    <div className={styles.userName}>{user.name}</div>
                                    <div className={styles.userDept}>{user.department}</div>
                                </div>
                            </div>
                            <div className={styles.badgesCell}>
                                {user.badges.slice(0, 3).map(b => (
                                    <span key={b.name} title={b.name} className={styles.badgeIcon}>{b.icon}</span>
                                ))}
                                {user.badges.length > 3 && (
                                    <span className={styles.moreBadges}>+{user.badges.length - 3}</span>
                                )}
                            </div>
                            <div className={styles.pointsCell}>{user.points}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function PodiumUser({ user, rank }: { user: any, rank: number }) {
    const positionClass = rank === 1 ? styles.first : rank === 2 ? styles.second : styles.third;

    return (
        <div className={`${styles.podiumItem} ${positionClass}`}>
            {rank === 1 && <div className={styles.crown}>👑</div>}
            <div className={styles.podiumAvatar}>{user.avatar}</div>
            <div className={styles.podiumBase}>
                <div className={styles.rankNumber}>{rank}</div>
                <div className={styles.podiumName}>{user.name}</div>
                <div className={styles.podiumPoints}>{user.points} pts</div>
            </div>
        </div>
    );
}
