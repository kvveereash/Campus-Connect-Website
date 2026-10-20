'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, Users } from 'lucide-react';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { CreateGroupModal } from './CreateGroupModal';
import { updatePresence } from '@/lib/actions/chat';
import styles from './Chat.module.css';

/**
 * Inbox on the left, the open conversation on the right. The open one lives
 * in the URL (?c=...) so a refresh or a shared link lands on it, and on a
 * phone that same param decides which of the two panes is showing.
 */
export default function ChatLayout() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const activeId = searchParams.get('c');
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        // Heartbeat for online status
        updatePresence();
        const interval = setInterval(updatePresence, 30000);
        return () => clearInterval(interval);
    }, []);

    const open = (id: string) => router.push(`/messages?c=${id}`);

    return (
        <div className={styles.chatContainer}>
            <aside className={`${styles.sidebar} ${activeId ? styles.hiddenMobile : ''}`} aria-label="Conversations">
                <div className={styles.sideHead}>
                    <div className={styles.sideTop}>
                        <div>
                            <span className={styles.sideKicker}>Inbox</span>
                            <h1 className={styles.sideTitle}>Messages</h1>
                        </div>
                        <button type="button" className={styles.newGroupBtn} onClick={() => setIsModalOpen(true)}>
                            <Plus size={15} aria-hidden="true" /> New group
                        </button>
                    </div>
                </div>
                <ConversationList activeId={activeId} onSelect={open} />
            </aside>

            <section className={`${styles.main} ${activeId ? '' : styles.hiddenMobile}`}>
                {activeId ? (
                    <ChatWindow key={activeId} conversationId={activeId} onBack={() => router.push('/messages')} />
                ) : (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyArt} aria-hidden="true">
                            <span />
                            <span />
                            <span />
                        </div>
                        <p className={styles.emptyTitle}>Pick up a conversation.</p>
                        <p className={styles.emptyText}>
                            Choose a chat on the left, or start a group for your hackathon team, your club
                            committee or your fest crew.
                        </p>
                        <div className={styles.emptyActions}>
                            <button
                                type="button"
                                className={`${styles.pillBtn} ${styles.pillPrimary}`}
                                onClick={() => setIsModalOpen(true)}
                            >
                                <Users size={15} aria-hidden="true" /> Start a group
                            </button>
                            <Link href="/team-finder" className={styles.pillBtn}>
                                Find teammates
                            </Link>
                        </div>
                    </div>
                )}
            </section>

            {isModalOpen && <CreateGroupModal onClose={() => setIsModalOpen(false)} onGroupCreated={open} />}
        </div>
    );
}
