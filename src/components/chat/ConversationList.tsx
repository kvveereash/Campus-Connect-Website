'use client';

import { useEffect, useState } from 'react';
import { getConversations } from '@/lib/actions/chat';
import Image from 'next/image';
import styles from './Chat.module.css';

interface ConversationListProps {
    activeId: string | null;
    onSelect: (id: string) => void;
}

export function ConversationList({ activeId, onSelect }: ConversationListProps) {
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchConvos = async () => {
        const data = await getConversations();
        setConversations(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchConvos();
        // Poll for new conversations or updates
        const interval = setInterval(fetchConvos, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className={styles.loading}>Loading chats...</div>;

    if (conversations.length === 0) return <div className={styles.empty}>No conversations yet</div>;

    return (
        <div className={styles.list}>
            {conversations.map(c => (
                <div
                    key={c.id}
                    className={`${styles.item} ${activeId === c.id ? styles.active : ''}`}
                    onClick={() => onSelect(c.id)}
                >
                    <div className={styles.avatar}>
                        {c.avatar ? (
                            <Image src={c.avatar} width={48} height={48} alt="" style={{ borderRadius: '16px', objectFit: 'cover' }} />
                        ) : (
                            <div className={styles.placeholderAvatarChat}>
                                {c.isGroup ? '👥' : (c.name?.[0] || '?')}
                            </div>
                        )}
                        {c.isOnline && !c.isGroup && <div className={styles.onlineStatusDot} />}
                    </div>
                    <div className={styles.info}>
                        <div className={styles.topRow}>
                            <span className={styles.name}>{c.name}</span>
                            <span className={styles.time}>{new Date(c.lastMessageAt).toLocaleDateString()}</span>
                        </div>
                        <p className={styles.preview}>{c.lastMessage}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
