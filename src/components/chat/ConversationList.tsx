'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { getConversations, type ConversationSummary } from '@/lib/actions/chat';
import { formatIST } from '@/lib/format';
import ChatAvatar from './ChatAvatar';
import styles from './Chat.module.css';

interface ConversationListProps {
    activeId: string | null;
    onSelect: (id: string) => void;
}

type Filter = 'all' | 'unread' | 'groups';

/** "2:05 pm" today, "Mon" this week, "12 Oct" before that. */
function stamp(value: string | Date) {
    const d = new Date(value);
    const now = new Date();
    const days = (now.getTime() - d.getTime()) / 86400000;
    const sameDay = formatIST(d, { day: 'numeric', month: 'numeric', year: 'numeric' }) ===
        formatIST(now, { day: 'numeric', month: 'numeric', year: 'numeric' });
    if (sameDay) return formatIST(d, { hour: 'numeric', minute: '2-digit' });
    if (days < 6) return formatIST(d, { weekday: 'short' });
    return formatIST(d, { day: 'numeric', month: 'short' });
}

export function ConversationList({ activeId, onSelect }: ConversationListProps) {
    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<Filter>('all');

    useEffect(() => {
        let alive = true;
        const fetchConvos = async () => {
            const data = await getConversations();
            if (!alive) return;
            setConversations(data);
            setLoading(false);
        };
        fetchConvos();
        // Poll for new conversations or updates
        const interval = setInterval(fetchConvos, 5000);
        return () => {
            alive = false;
            clearInterval(interval);
        };
    }, []);

    const unreadCount = conversations.filter((c) => c.unread && c.id !== activeId).length;

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return conversations.filter((c) => {
            if (filter === 'unread' && !(c.unread && c.id !== activeId)) return false;
            if (filter === 'groups' && !c.isGroup) return false;
            if (!q) return true;
            return c.name?.toLowerCase().includes(q) || c.lastMessage?.toLowerCase().includes(q);
        });
    }, [conversations, query, filter, activeId]);

    const filters: { key: Filter; label: string; count?: number }[] = [
        { key: 'all', label: 'All' },
        { key: 'unread', label: 'Unread', count: unreadCount },
        { key: 'groups', label: 'Groups' },
    ];

    return (
        <>
            <div className={styles.sideHead} style={{ paddingTop: 0 }}>
                <label className={styles.searchBox}>
                    <Search size={15} aria-hidden="true" />
                    <input
                        className={styles.searchInput}
                        type="search"
                        placeholder="Search people and messages"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        aria-label="Search conversations"
                    />
                </label>
                <div className={styles.filters} role="group" aria-label="Filter conversations">
                    {filters.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            className={`${styles.filter} ${filter === f.key ? styles.filterActive : ''}`}
                            aria-pressed={filter === f.key}
                            onClick={() => setFilter(f.key)}
                        >
                            {f.label}
                            {!!f.count && <span className={styles.filterCount}>{f.count}</span>}
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.list}>
                {loading ? (
                    Array.from({ length: 5 }, (_, i) => (
                        <div key={i} className={styles.skeletonRow} aria-hidden="true">
                            <span className={styles.skeletonCircle} />
                            <span style={{ flex: 1, display: 'grid', gap: 8 }}>
                                <span className={styles.skeletonLine} style={{ width: '55%' }} />
                                <span className={styles.skeletonLine} style={{ width: '85%' }} />
                            </span>
                        </div>
                    ))
                ) : conversations.length === 0 ? (
                    <div className={styles.listEmpty}>
                        <strong>No conversations yet.</strong>
                        Open anyone&rsquo;s profile and press Message, or start a group for your team.
                        <br />
                        <Link href="/team-finder">Find teammates</Link>
                    </div>
                ) : shown.length === 0 ? (
                    <div className={styles.listEmpty}>
                        <strong>Nothing here.</strong>
                        {query ? `No conversation matches “${query}”.` : 'You are all caught up.'}
                    </div>
                ) : (
                    shown.map((c) => {
                        const unread = c.unread && c.id !== activeId;
                        const who = c.lastMessageFromMe
                            ? 'You: '
                            : c.isGroup && c.lastSenderName
                              ? `${c.lastSenderName.split(' ')[0]}: `
                              : '';
                        return (
                            <button
                                key={c.id}
                                type="button"
                                className={`${styles.item} ${activeId === c.id ? styles.active : ''} ${unread ? styles.unread : ''}`}
                                onClick={() => onSelect(c.id)}
                                aria-current={activeId === c.id ? 'true' : undefined}
                            >
                                <span className={styles.avatar}>
                                    <ChatAvatar name={c.name || '?'} src={c.avatar} group={c.isGroup} />
                                    {c.isOnline && !c.isGroup && <span className={styles.onlineStatusDot} />}
                                </span>
                                <span className={styles.info}>
                                    <span className={styles.topRow}>
                                        <span className={styles.name}>{c.name}</span>
                                        <span className={styles.time}>{stamp(c.lastMessageAt)}</span>
                                    </span>
                                    <span className={styles.previewRow}>
                                        <span className={styles.preview}>
                                            {who && <span className={styles.previewWho}>{who}</span>}
                                            {c.lastMessage}
                                        </span>
                                        {unread && <span className={styles.unreadDot} aria-label="Unread" />}
                                    </span>
                                </span>
                            </button>
                        );
                    })
                )}
            </div>
        </>
    );
}
