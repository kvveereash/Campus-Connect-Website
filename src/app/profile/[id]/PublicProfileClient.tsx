'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Link2, MessageCircle } from 'lucide-react';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import ProfileHero, { heroButton, heroButtonPrimary } from '@/components/profile/ProfileHero';
import ProfileTabs from '@/components/profile/ProfileTabs';
import EventSection from '@/components/profile/EventSection';
import { useAuth } from '@/context/AuthContext';
import { startConversation } from '@/lib/actions/chat';
import type { PublicProfile } from '@/lib/actions/profile';
import type { EventWithRelations } from '@/lib/actions/events';
import styles from '@/app/profile/page.module.css';
import { formatIST } from '@/lib/format';

interface Props {
    user: PublicProfile;
    registered: EventWithRelations[];
    hosted: EventWithRelations[];
}

type Tab = 'registered' | 'hosted' | 'professional';

/**
 * The profile a stranger sees — the one the "Copy profile link" button hands
 * out. It shares the hero, tabs and event sheets with your own profile, so
 * following a shared link does not land you on what looks like a different
 * product.
 */
export default function PublicProfileClient({ user, registered, hosted }: Props) {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('registered');
    const [startingChat, setStartingChat] = useState(false);

    const isMe = currentUser?.id === user.id;
    const joined = formatIST(user.createdAt, {
        month: 'long',
        year: 'numeric',
    });
    const firstName = user.name.split(' ')[0];
    const [pastDates] = useState(() => {
        const now = Date.now();
        return [...registered, ...hosted]
            .map((e) => new Date(e.date))
            .filter((d) => d.getTime() <= now)
            .map((d) => d.toISOString());
    });

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

    const handleCopy = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Profile link copied');
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
            <ProfileHero
                name={user.name}
                avatar={user.avatar}
                department={user.department}
                year={user.year}
                college={user.college ? { id: user.college.id, name: user.college.name } : null}
                bio={user.bio}
                since={`Member since ${joined}`}
                stats={[
                    { label: 'Attending', value: user._count.registrations, mark: 'var(--press-technology)' },
                    { label: 'Hosted', value: user._count.createdEvents, mark: 'var(--press-cultural)' },
                    { label: 'Clubs', value: user._count.clubMemberships, mark: 'var(--press-sports)' },
                ]}
                skills={user.skills.map((s) => s.name)}
                badges={user.badges}
                actions={
                    <>
                        {!isMe && currentUser && (
                            <button
                                type="button"
                                onClick={handleMessage}
                                disabled={startingChat}
                                className={heroButtonPrimary}
                            >
                                <MessageCircle size={15} aria-hidden="true" />
                                {startingChat ? 'Opening' : `Message ${firstName}`}
                            </button>
                        )}
                        <button type="button" onClick={handleCopy} className={heroButton}>
                            <Link2 size={14} aria-hidden="true" /> Copy link
                        </button>
                    </>
                }
            />

            {/* The graph covers the past year, so it only shows once some of
                this person's events are behind them; upcoming ones would
                leave it blank. */}
            {pastDates.length > 0 && (
                <div className={styles.heatmapCard}>
                    <ActivityHeatmap dates={pastDates} />
                </div>
            )}

            <ProfileTabs<Tab> tabs={tabs} active={activeTab} onChange={setActiveTab} />

            <div
                key={activeTab}
                className={styles.content}
                role="tabpanel"
                id={`${activeTab}-panel`}
                aria-labelledby={`${activeTab}-tab`}
            >
                {activeTab === 'registered' && (
                    <EventSection
                        kicker="Registered"
                        title="Attending"
                        events={registered}
                        empty={{
                            title: 'Not attending anything yet.',
                            text: `When ${firstName} registers for an event, it shows up here.`,
                        }}
                    />
                )}
                {activeTab === 'hosted' && (
                    <EventSection
                        kicker="Organised"
                        title="Hosted"
                        events={hosted}
                        empty={{
                            title: 'Has not hosted an event yet.',
                            text: `Events ${firstName} organises will be listed here.`,
                        }}
                    />
                )}

                {activeTab === 'professional' && (
                    <>
                        <section className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h2 className={styles.cardTitle}>Projects</h2>
                            </div>
                            {user.projects.length > 0 ? (
                                <div className={styles.projectList}>
                                    {user.projects.map((p, i) => (
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
                                    {user.achievements.map((a, i) => (
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
                                    {user.portfolioLinks.map((l, i) => (
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

