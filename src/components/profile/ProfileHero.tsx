import Image from 'next/image';
import Link from 'next/link';
import { Building2, GraduationCap } from 'lucide-react';
import { resolveCollegeImage } from '@/lib/college-images';
import styles from './ProfileHero.module.css';

export interface ProfileStat {
    label: string;
    value: number;
    /** A category colour for the small square beside the label. */
    mark: string;
}

interface ProfileHeroProps {
    name: string;
    avatar?: string | null;
    department?: string | null;
    year?: string | null;
    college?: { id?: string; name: string } | null;
    bio?: string | null;
    /** e.g. "Member since October 2026" */
    since?: string;
    stats: ProfileStat[];
    skills?: string[];
    badges?: { id: string; icon: string; name: string; description?: string }[];
    /** Buttons for the right of the name row: edit/settings for you, message for others. */
    actions?: React.ReactNode;
}

/**
 * The top of a profile, yours or anyone's. The cover is the person's own
 * campus, tinted into the brand blue, so a profile says where someone is
 * from before it says anything else.
 */
export default function ProfileHero({
    name,
    avatar,
    department,
    year,
    college,
    bio,
    since,
    stats,
    skills = [],
    badges = [],
    actions,
}: ProfileHeroProps) {
    const study = [department, year].filter(Boolean).join(' · ');

    return (
        <section className={styles.hero}>
            <div className={styles.cover} aria-hidden="true">
                <Image
                    src={resolveCollegeImage(college ? { name: college.name } : null)}
                    alt=""
                    fill
                    priority
                    sizes="(max-width: 1200px) 100vw, 1200px"
                />
                <span className={styles.coverTint} />
            </div>

            <div className={styles.body}>
                <div className={styles.topRow}>
                    <div className={styles.avatar}>
                        {avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatar} alt="" />
                        ) : (
                            <span>{name.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                    {actions && <div className={styles.actions}>{actions}</div>}
                </div>

                <div className={styles.identity}>
                    <h1 className={styles.name}>{name}</h1>
                    <div className={styles.meta}>
                        {study && (
                            <span className={styles.metaItem}>
                                <GraduationCap size={15} aria-hidden="true" /> {study}
                            </span>
                        )}
                        {college?.name &&
                            (college.id ? (
                                <Link href={`/colleges/${college.id}`} className={styles.metaItem}>
                                    <Building2 size={15} aria-hidden="true" /> {college.name}
                                </Link>
                            ) : (
                                <span className={styles.metaItem}>
                                    <Building2 size={15} aria-hidden="true" /> {college.name}
                                </span>
                            ))}
                        {since && <span className={styles.since}>{since}</span>}
                    </div>
                    {bio && <p className={styles.bio}>{bio}</p>}
                </div>

                <div className={styles.lower}>
                    <dl className={styles.stats}>
                        {stats.map((s) => (
                            <div key={s.label} className={styles.stat}>
                                <dt>
                                    <span className={styles.square} style={{ background: s.mark }} aria-hidden="true" />
                                    {s.label}
                                </dt>
                                <dd>{s.value}</dd>
                            </div>
                        ))}
                    </dl>

                    {(skills.length > 0 || badges.length > 0) && (
                        <div className={styles.extras}>
                            {skills.length > 0 && (
                                <div className={styles.group}>
                                    <span className={styles.groupLabel}>Skills</span>
                                    <div className={styles.chips}>
                                        {skills.map((skill) => (
                                            <span key={skill} className={styles.chip}>
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {badges.length > 0 && (
                                <div className={styles.group}>
                                    <span className={styles.groupLabel}>Badges</span>
                                    <div className={styles.badges}>
                                        {badges.map((b) => (
                                            <span
                                                key={b.id}
                                                className={styles.badge}
                                                title={b.description ? `${b.name}: ${b.description}` : b.name}
                                            >
                                                {b.icon}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

/* Shared button styles for the actions slot, so both profiles match. */
export const heroButton = styles.button;
export const heroButtonPrimary = `${styles.button} ${styles.primary}`;
export const heroButtonGhost = `${styles.button} ${styles.ghost}`;
