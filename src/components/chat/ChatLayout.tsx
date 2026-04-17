'use client';

import React, { useState, useEffect } from 'react';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { CreateGroupModal } from './CreateGroupModal';
import styles from './Chat.module.css';
import { useSearchParams, useRouter } from 'next/navigation';

import { updatePresence } from '@/lib/actions/chat';

export default function ChatLayout() {
    // Current conversation ID from URL or state
    // Actually URL param ?c=... is better for refreshing
    const searchParams = useSearchParams();
    const router = useRouter();
    const activeId = searchParams.get('c');

    const [mobileView, setMobileView] = useState('list'); // 'list' or 'chat'
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        // Heartbeat for online status
        updatePresence();
        const interval = setInterval(updatePresence, 30000); // Every 30s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (activeId) {
            setMobileView('chat');
        } else {
            setMobileView('list');
        }
    }, [activeId]);

    const handleSelect = (id: string) => {
        router.push(`/messages?c=${id}`);
    };

    const handleBack = () => {
        router.push('/messages');
    };

    const handleGroupCreated = (id: string) => { // Auto-select new group
        router.push(`/messages?c=${id}`);
    };

    return (
        <div className={styles.chatContainer}>
            <div className={`${styles.sidebar} ${mobileView === 'chat' ? styles.hiddenMobile : ''}`}>
                <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>Messages</h2>
                    <button className={styles.createGroupBtn} onClick={() => setIsModalOpen(true)} title="Create Group">+</button>
                </div>
                <ConversationList activeId={activeId} onSelect={handleSelect} />
            </div>
            <div className={`${styles.main} ${mobileView === 'list' ? styles.hiddenMobile : ''}`}>
                {activeId ? (
                    <ChatWindow conversationId={activeId} onBack={handleBack} />
                ) : (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIconWrapper}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        </div>
                        <p>No Conversation Selected</p>
                        <span>Choose a chat from the sidebar to start messaging</span>
                    </div>
                )}
            </div>
            {isModalOpen && <CreateGroupModal onClose={() => setIsModalOpen(false)} onGroupCreated={handleGroupCreated} />}
        </div>
    );
}
