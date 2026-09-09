'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { GraduationCap, Building2 } from 'lucide-react';
import EventCard from '@/components/EventCard';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import { useAuth } from '@/context/AuthContext';
import { startConversation } from '@/lib/actions/chat';
import type { PublicProfile } from '@/lib/actions/profile';
import type { EventWithRelations } from '@/lib/actions/events';
import styles from '@/app/profile/page.module.css';

interface Props {
    user: PublicProfile;
    registered: EventWithRelations[];
    hosted: EventWithRelations[];
}

type Tab = 'registered' | 'hosted' | 'professional';

/**
 * The profile a stranger sees — the one the "Copy profile link" button hands
 * out. It used to be a second, unrelated implementation in inline Tailwind:
 * rounded panels, bold headings, a separate stat block. It now uses the same
 * ID-card sheet as the signed-in profile, so following a shared link does not
 * land you on what looks like a different product.
 */
export default function PublicProfileClient({ user, registered, hosted }: Props) {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('registered');
    const [startingChat, setStartingChat] = useState(false);

    const isMe = currentUser?.id === user.id;
    const joined = new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
    });

    // Nullable columns, so an untouched profile omits the line rather than
    // printing "undefined · undefined".
    const studyLine = [user.department, user.year]
        .filter(Boolean)
        .map((v) => String(v).toUpperCase())
        .join(' · ');

    const handleMessage = async () => {
        setStartingChat(true);
        try {
            const result = await startConversation(user.id);
            if (result.success && result.data) {
                router.push(`/messages?c=${result.data}`);
            } else {
                toast.error(result.error || 'Could not start the conversation');
            }
        } catch {
            toast.error('Something went wrong starting the chat');
        } finally {
            setStartingChat(false);
        }
    };

    const tabs: { key: Tab; label: string; count: number }[] = [
        { key: 'registered', label: 'Attending', count: registered.length },
        { key: 'hosted', label: 'Hosted', count: hosted.length },
        {
            key: 'professional',
            label: 'Work',
            count: user.projects.length + user.achievements.length,
        },
    ];

    return (
        <div className={styles.container}>
            <div className={styles.idCardContainer}>
                <div className={styles.idSidebar}>
                    <div className={styles.sidebarTopClip}>
                        <div className={styles.clipHole} />
                    </div>

                    <div className={styles.idAvatarContainer}>
                        <div className={styles.idAvatarBorder}>
                            {user.avatar ? (
                                <Image
                                    src={user.avatar}
                                    alt=""
                                    width={132}
                                    height={132}
                                    className={styles.idAvatarImage}
                                />
                            ) : (
                                <div className={styles.idAvatarPlaceholder}>
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.sidebarLabel}>
                        <span className={styles.labelSub}>Student</span>
                        <span className={styles.labelMain}>Campus Connect</span>
                    </div>

                    <div className={styles.verticalText}>Since {joined}</div>
                </div>

                <div className={styles.idContent}>
                    <div className={styles.idHeaderRow}>
                        <h1 className={styles.idName}>{user.name}</h1>
                    </div>

                    <div className={styles.idMetadata}>
                        {studyLine && (
                            <div className={styles.idMetaLine}>
                                <GraduationCap size={16} className={styles.metaIcon} />
                                <span className={styles.idDeptYear}>{studyLine}</span>
                            </div>
                        )}
                        {user.college?.name && (
                            <div className={styles.idMetaLine}>
                                <Building2 size={16} className={styles.metaIcon} />
                                <Link
                                    href={`/colleges/${user.college.id}`}
                                    className={styles.idCollege}
                                >
                                    {user.college.name.toUpperCase()}
                                </Link>
                            </div>
                        )}
                    </div>

                    {user.bio && (
                        <div className={styles.idBioBlock}>
                            <div className={styles.bioQuoteLine} />
                            <p className={styles.idBioText}>{user.bio}</p>
                        </div>
                    )}

                    <div className={styles.idFooterActions}>
                        {/* Counts belong beside the name, not in a separate
                            panel — they describe this person. */}
                        <div className={styles.idUtilityActions}>
                            <span className={styles.utilDivider}>
                                {user._count.registrations} attending
                            </span>
                            <span className={styles.utilDivider}>·</span>
                            <span className={styles.utilDivider}>
                                {user._count.createdEvents} hosted
                            </span>
                            <span className={styles.utilDivider}>·</span>
                            <span className={styles.utilDivider}>
                                {user._count.clubMemberships} clubs
                            </span>
                        </div>

                        {!isMe && currentUser && (
                            <button
                                type="button"
                                onClick={handleMessage}
                                disabled={startingChat}
                                className={styles.addSkillBtn}
                            >
                                {startingChat ? 'Opening' : 'Message'}
                            </button>
                        )}
                    </div>

                    {(user.skills.length > 0 || user.badges.length > 0) && (
                        <div className={styles.idExtraInfo}>
                            {user.skills.length > 0 && (
                                <div className={styles.idExtraGroup}>
                                    <span className={styles.idExtraLabel}>Skills</span>
                                    <div className={styles.idSkillTags}>
                                        {/* Skills are rows here, not the plain
                                            strings the signed-in profile keeps. */}
                                        {user.skills.map((skill) => (
                                            <span key={skill.id} className={styles.idSkillTag}>
                                                {skill.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {user.badges.length > 0 && (
                                <div className={styles.idExtraGroup}>
                                    <span className={styles.idExtraLabel}>Badges</span>
                                    <div className={styles.idBadgesMini}>
                                        {user.badges.map((b) => (
                                            <div
                                                key={b.id}
                                                className={styles.idBadgeMini}
                                                title={`${b.name} — ${b.description}`}
                                            >
                                                {b.icon}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {(registered.length > 0 || hosted.length > 0) && (
                <div style={{ marginTop: 40 }}>
                    <ActivityHeatmap
                        dates={[...registered, ...hosted].map((e) =>
                            new Date(e.date).toISOString()
                        )}
                    />
                </div>
            )}

            <div className={styles.tabs} role="tablist" aria-label="Profile sections">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`${styles.tab} ${activeTab === t.key ? styles.activeTab : ''}`}
                    >
                        {t.label} {t.count}
                        {activeTab === t.key && <span className={styles.activeTabLine} />}
                    </button>
                ))}
            </div>

            <div className={styles.content}>
                {activeTab === 'registered' && (
                    <EventGrid events={registered} empty="Not attending anything yet." />
                )}
                {activeTab === 'hosted' && (
                    <EventGrid events={hosted} empty="Has not hosted an event yet." />
                )}

                {activeTab === 'professional' && (
                    <>
                        <section className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h2 className={styles.cardTitle}>Projects</h2>
                            </div>
                            {user.projects.length > 0 ? (
                                <div className={styles.projectList}>
                                    {user.projects.map((p: any, i: number) => (
                                        <div key={p.id ?? i} className={styles.projectCard}>
                                            <h3 className={styles.projectTitle}>{p.title}</h3>
                                            {p.description && (
                                                <p className={styles.projectDesc}>
                                                    {p.description}
                                                </p>
                                            )}
                                            {p.link && (
                                                <a
                                                    href={p.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={styles.projectLink}
                                                >
                                                    View project
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className={styles.empty}>Nothing shared yet.</p>
                            )}
                        </section>

                        <section className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h2 className={styles.cardTitle}>Achievements</h2>
                            </div>
                            {user.achievements.length > 0 ? (
                                <div className={styles.achievementList}>
                                    {user.achievements.map((a: any, i: number) => (
                                        <div key={a.id ?? i} className={styles.achievementItem}>
                                            <div className={styles.achievementHeader}>
                                                <h3 className={styles.projectTitle}>{a.title}</h3>
                                                {a.date && (
                                                    <span className={styles.achievementDate}>
                                                        {a.date}
                                                    </span>
                                                )}
                                            </div>
                                            {a.description && (
                                                <p className={styles.projectDesc}>
                                                    {a.description}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className={styles.empty}>Nothing shared yet.</p>
                            )}
                        </section>

                        {user.portfolioLinks.length > 0 && (
                            <section className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <h2 className={styles.cardTitle}>Links</h2>
                                </div>
                                <div className={styles.portfolioList}>
                                    {user.portfolioLinks.map((l: any, i: number) => (
                                        <div key={l.id ?? i} className={styles.portfolioItem}>
                                            <div className={styles.linkInfo}>
                                                <span className={styles.platformName}>
                                                    {l.platform || 'Link'}
                                                </span>
                                            </div>
                                            <a
                                                href={l.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.externalLink}
                                            >
                                                Open
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function EventGrid({ events, empty }: { events: EventWithRelations[]; empty: string }) {
    if (events.length === 0) return <p className={styles.empty}>{empty}</p>;
    return (
        <div className={styles.eventsGrid}>
            {events.map((e, i) => (
                <EventCard key={e.id} event={e} index={i} />
            ))}
        </div>
    );
}
