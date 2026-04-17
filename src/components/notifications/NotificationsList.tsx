'use client';

import { useEffect, useState } from 'react';
import { getNotifications, markNotificationAsRead as markAsRead, markAllNotificationsAsRead as markAllAsRead } from '@/lib/actions/notifications';
import Link from 'next/link';
import Image from 'next/image';
import styles from './Notifications.module.css';

interface NotificationListProps {
    onMarkedRead: () => void;
    onAllRead: () => void;
    close: () => void;
}

export function NotificationsList({ onMarkedRead, onAllRead, close }: NotificationListProps) {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            const data = await getNotifications();
            setNotifications(data);
            setLoading(false);
        };
        fetch();
    }, []);

    const handleRead = async (id: string, link?: string, isRead?: boolean) => {
        if (!isRead) {
            await markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            onMarkedRead();
        }
        if (link) {
            close();
        }
    };

    const handleMarkAll = async () => {
        await markAllAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        onAllRead();
    };

    if (loading) return <div className={styles.loading}>Loading...</div>;

    if (notifications.length === 0) return <div className={styles.empty}>No notifications</div>;

    return (
        <div className={styles.listContainer}>
            <div className={styles.header}>
                <h3>Notifications</h3>
                <button onClick={handleMarkAll} className={styles.markAllBtn}>Mark all read</button>
            </div>
            <div className={styles.scrollArea}>
                {notifications.map(n => (
                    <div
                        key={n.id}
                        className={`${styles.item} ${n.read ? styles.read : styles.unread}`}
                        onClick={() => handleRead(n.id, n.link, n.read)}
                    >
                        {n.link ? (
                            <Link href={n.link} className={styles.linkWrapper}>
                                <Content n={n} />
                            </Link>
                        ) : (
                            <Content n={n} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function Content({ n }: { n: any }) {
    return (
        <>
            <div className={styles.avatar}>
                {n.actor?.avatar ? (
                    <Image src={n.actor.avatar} width={32} height={32} alt="" style={{ borderRadius: '50%' }} />
                ) : (
                    <div className={styles.placeholderAvatar}>🔔</div>
                )}
            </div>
            <div className={styles.content}>
                <p>
                    <span className={styles.actorName}>{n.actor?.name || 'System'}</span> {n.message}
                </p>
                <span className={styles.time}>{new Date(n.createdAt).toLocaleDateString()}</span>
            </div>
            {!n.read && <div className={styles.dot} />}
        </>
    );
}
