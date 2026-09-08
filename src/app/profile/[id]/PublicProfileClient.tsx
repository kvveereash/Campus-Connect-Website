'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { GraduationCap, MapPin, CalendarDays, Trophy, Link2, MessageCircle } from 'lucide-react';
import EventCard from '@/components/EventCard';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import { useAuth } from '@/context/AuthContext';
import { startConversation } from '@/lib/actions/chat';
import type { PublicProfile } from '@/lib/actions/profile';
import type { EventWithRelations } from '@/lib/actions/events';

interface Props {
    user: PublicProfile;
    registered: EventWithRelations[];
    hosted: EventWithRelations[];
}

type Tab = 'registered' | 'hosted' | 'professional';

export default function PublicProfileClient({ user, registered, hosted }: Props) {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('registered');
    const [startingChat, setStartingChat] = useState(false);

    const isMe = currentUser?.id === user.id;
    const joined = new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

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
        { key: 'professional', label: 'Profile', count: user.projects.length + user.achievements.length },
    ];

    return (
        <div className="mx-auto max-w-5xl px-4 py-8">
            {/* ── Header ── */}
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-color)] p-6 sm:p-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                    {user.avatar ? (
                        <Image
                            src={user.avatar}
                            alt={user.name}
                            width={96}
                            height={96}
                            className="h-24 w-24 shrink-0 rounded-2xl object-cover"
                        />
                    ) : (
                        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-forest)] text-3xl font-bold text-[var(--color-cream)]">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                    )}

                    <div className="min-w-0 flex-1">
                        <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">{user.name}</h1>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--text-secondary)]">
                            {(user.department || user.year) && (
                                <span className="inline-flex items-center gap-1.5">
                                    <GraduationCap size={15} />
                                    {[user.year, user.department].filter(Boolean).join(' · ')}
                                </span>
                            )}
                            {user.college && (
                                <Link
                                    href={`/colleges/${user.college.id}`}
                                    className="inline-flex items-center gap-1.5 hover:text-[var(--text-primary)] hover:underline"
                                >
                                    <MapPin size={15} />
                                    {user.college.name}
                                </Link>
                            )}
                            <span className="inline-flex items-center gap-1.5">
                                <CalendarDays size={15} />
                                Joined {joined}
                            </span>
                        </div>

                        {user.bio && (
                            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--text-secondary)]">
                                {user.bio}
                            </p>
                        )}

                        {user.skills.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {user.skills.map((s) => (
                                    <span
                                        key={s.id}
                                        className="rounded-full border border-[var(--border-color)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]"
                                    >
                                        {s.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        {!isMe && currentUser && (
                            <button
                                onClick={handleMessage}
                                disabled={startingChat}
                                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--color-forest)] px-4 py-2 text-sm font-semibold text-[var(--color-cream)] transition hover:opacity-90 disabled:opacity-50"
                            >
                                <MessageCircle size={16} />
                                {startingChat ? 'Opening…' : 'Message'}
                            </button>
                        )}
                    </div>

                    <div className="flex gap-6 sm:flex-col sm:gap-3 sm:border-l sm:border-[var(--border-color)] sm:pl-6">
                        <Stat label="Attending" value={user._count.registrations} />
                        <Stat label="Hosted" value={user._count.createdEvents} />
                        <Stat label="Clubs" value={user._count.clubMemberships} />
                    </div>
                </div>
            </div>

            {/* ── Badges ── */}
            {user.badges.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-3">
                    {user.badges.map((b) => (
                        <div
                            key={b.id}
                            title={b.description}
                            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] px-3 py-2"
                        >
                            <span className="text-lg leading-none">{b.icon}</span>
                            <span className="text-sm font-medium text-[var(--text-primary)]">{b.name}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Activity ── */}
            {(registered.length > 0 || hosted.length > 0) && (
                <div className="mt-6">
                    <ActivityHeatmap dates={[...registered, ...hosted].map((e) => new Date(e.date).toISOString())} />
                </div>
            )}

            {/* ── Tabs ── */}
            <div className="mt-8 flex gap-6 border-b border-[var(--border-color)]">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`-mb-px border-b-2 pb-3 text-sm font-semibold transition ${
                            activeTab === t.key
                                ? 'border-[var(--color-forest)] text-[var(--text-primary)]'
                                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        {t.label}
                        <span className="ml-1.5 text-xs opacity-60">{t.count}</span>
                    </button>
                ))}
            </div>

            <div className="mt-6 min-h-[240px]">
                {activeTab === 'registered' && <EventGrid events={registered} empty="Not attending any events yet." />}
                {activeTab === 'hosted' && <EventGrid events={hosted} empty="Hasn't hosted an event yet." />}

                {activeTab === 'professional' && (
                    <div className="space-y-6">
                        <Section title="Projects" icon={<Link2 size={17} />}>
                            {user.projects.length > 0 ? (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {user.projects.map((p: any, i: number) => (
                                        <div
                                            key={p.id ?? i}
                                            className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-4"
                                        >
                                            <h4 className="font-semibold text-[var(--text-primary)]">{p.title}</h4>
                                            {p.description && (
                                                <p className="mt-1 text-sm text-[var(--text-secondary)]">{p.description}</p>
                                            )}
                                            {p.link && (
                                                <a
                                                    href={p.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-2 inline-block text-sm font-medium underline"
                                                >
                                                    View project →
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <Empty>No projects shared yet.</Empty>
                            )}
                        </Section>

                        <Section title="Achievements" icon={<Trophy size={17} />}>
                            {user.achievements.length > 0 ? (
                                <div className="space-y-3">
                                    {user.achievements.map((a: any, i: number) => (
                                        <div
                                            key={a.id ?? i}
                                            className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-4"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <h4 className="font-semibold text-[var(--text-primary)]">{a.title}</h4>
                                                {a.date && (
                                                    <span className="shrink-0 text-xs text-[var(--text-secondary)]">{a.date}</span>
                                                )}
                                            </div>
                                            {a.description && (
                                                <p className="mt-1 text-sm text-[var(--text-secondary)]">{a.description}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <Empty>No achievements shared yet.</Empty>
                            )}
                        </Section>

                        {user.portfolioLinks.length > 0 && (
                            <Section title="Links" icon={<Link2 size={17} />}>
                                <div className="flex flex-wrap gap-2">
                                    {user.portfolioLinks.map((l: any, i: number) => (
                                        <a
                                            key={l.id ?? i}
                                            href={l.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm font-medium hover:bg-[var(--surface-color)]"
                                        >
                                            {l.platform || l.url}
                                        </a>
                                    ))}
                                </div>
                            </Section>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div className="text-center sm:text-left">
            <div className="text-xl font-bold text-[var(--text-primary)]">{value}</div>
            <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">{label}</div>
        </div>
    );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <section>
            <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
                {icon}
                {title}
            </h3>
            {children}
        </section>
    );
}

function Empty({ children }: { children: React.ReactNode }) {
    return <p className="py-8 text-center text-sm text-[var(--text-secondary)]">{children}</p>;
}

function EventGrid({ events, empty }: { events: EventWithRelations[]; empty: string }) {
    if (events.length === 0) return <Empty>{empty}</Empty>;
    return (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e, i) => (
                <EventCard key={e.id} event={e} index={i} />
            ))}
        </div>
    );
}
