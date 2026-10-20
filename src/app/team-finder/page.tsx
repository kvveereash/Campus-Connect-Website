import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { getSessionUser, getRecommendedTeammates } from '@/lib/actions';
import styles from './page.module.css';

export const metadata: Metadata = {
    title: 'Find Teammates',
    description: 'People at your college who share your skills and interests.',
};

type Match = Awaited<ReturnType<typeof getRecommendedTeammates>>[number];

const SKILLS_SHOWN = 5;

export default async function TeamFinderPage() {
    const user = await getSessionUser();

    // The middleware sends signed-out visitors to /login first; this is the
    // fallback if a session expires between the two.
    if (!user) {
        return (
            <div className={styles.page}>
                <div className={styles.empty}>
                    <h1 className={styles.emptyTitle}>Sign in to find teammates</h1>
                    <p className={styles.emptyText}>Matches come from your profile, so we need to know who you are.</p>
                    <Link href="/login?redirect=/team-finder" className={styles.primary}>Sign in</Link>
                </div>
            </div>
        );
    }

    let matches: Match[] = [];
    try {
        matches = await getRecommendedTeammates();
    } catch (e) {
        console.error('Match fetch error', e);
    }

    const profileIsThin = (user.skills?.length ?? 0) === 0 && (user.interests?.length ?? 0) === 0;

    return (
        <div className={styles.page}>
            <header className={styles.masthead}>
                <div>
                    <p className={styles.label}>Team finder</p>
                    <h1 className={styles.title}>
                        Find your people for the <em className="accent">next build.</em>
                    </h1>
                    <p className={styles.lede}>
                        Students at {user.college?.name ?? 'your college'}, ranked by the skills and
                        interests you have in common.
                    </p>
                </div>
                <span className={styles.count}>
                    {matches.length} {matches.length === 1 ? 'match' : 'matches'}
                </span>
            </header>

            {profileIsThin && (
                <aside className={styles.notice}>
                    <div>
                        <p className={styles.noticeTitle}>Your matches are guesses for now</p>
                        <p className={styles.noticeText}>
                            Add a few skills and interests to your profile and this list starts ranking
                            people by what you actually share.
                        </p>
                    </div>
                    <Link href="/profile" className={styles.secondary}>Add skills</Link>
                </aside>
            )}

            {matches.length > 0 ? (
                <ul className={styles.grid} data-reveal-group>
                    {matches.map((match) => (
                        <li key={match.id}>
                            <MatchCard match={match} />
                        </li>
                    ))}
                </ul>
            ) : (
                <div className={styles.empty}>
                    <h2 className={styles.emptyTitle}>No one to suggest yet</h2>
                    <p className={styles.emptyText}>
                        Nobody else from your college is on Campus Connect yet, or none of their profiles
                        overlap with yours. Filling in your skills and interests helps either way.
                    </p>
                    <Link href="/profile" className={styles.primary}>Update my profile</Link>
                </div>
            )}
        </div>
    );
}

function MatchCard({ match }: { match: Match }) {
    const score = Math.max(0, Math.min(match.matchScore ?? 0, 100));
    const extraSkills = match.skills.length - SKILLS_SHOWN;
    const meta = [match.department, match.year].filter(Boolean).join(' · ');

    return (
        <article className={styles.card}>
            <div className={styles.cardHead}>
                <span className={styles.avatar} aria-hidden="true">{match.avatar}</span>
                <div className={styles.who}>
                    <h2 className={styles.name}>{match.name}</h2>
                    {meta && <p className={styles.meta}>{meta}</p>}
                </div>
            </div>

            <div className={styles.score}>
                <div className={styles.scoreRow}>
                    <span className={styles.scoreLabel}>Match</span>
                    <span className={styles.scoreValue}>{score}%</span>
                </div>
                {/* Relative to your strongest match, the only scale the score has. */}
                <div className={styles.meter} role="presentation">
                    <span className={styles.meterFill} style={{ width: `${score}%` }} />
                </div>
            </div>

            {match.bio && <p className={styles.bio}>{match.bio}</p>}

            {match.skills.length > 0 && (
                <ul className={styles.skills} aria-label="Skills">
                    {match.skills.slice(0, SKILLS_SHOWN).map((skill) => (
                        <li key={skill} className={styles.skill}>{skill}</li>
                    ))}
                    {extraSkills > 0 && <li className={styles.skillMore}>+{extraSkills}</li>}
                </ul>
            )}

            {match.matchReasons.length > 0 && (
                <p className={styles.reasons}>{match.matchReasons.join(' · ')}</p>
            )}

            {/* This button used to say "Connect" and do nothing. The profile
                is where you can see more of them and send a message. */}
            <Link href={`/profile/${match.id}`} className={styles.cardAction}>
                View profile
                <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
        </article>
    );
}
