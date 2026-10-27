'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { pusherClient } from '@/lib/pusher-client';
import { userChannel } from '@/lib/pusher-channels';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/actions/notifications';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import styles from './Notifications.module.css';
import { formatIST } from '@/lib/format';
import PushToggle from '@/components/PushToggle';

type Notification = {
    id: string;
    message: string;
    link: string | null;
    type: string;
    read: boolean;
    createdAt: Date;
    actor?: {
        name: string;
        avatar: string | null
    } | null;
};

export function NotificationBell() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch initial
    useEffect(() => {
        if (user?.id) {
            getNotifications()
                .then(data => {
                    // Ensure dates are Date objects if serialized
                    const parsed = data.map(n => ({
                        ...n,
                        createdAt: new Date(n.createdAt)
                    }));
                    setNotifications(parsed);
                    setUnreadCount(parsed.filter(n => !n.read).length);
                })
                // A failed load shows the empty state rather than "Loading" forever.
                .catch(() => {})
                .finally(() => setLoading(false));
        }
    }, [user?.id]);

    // Pusher Subscription
    useEffect(() => {
        if (!user?.id) return;

        const channel = pusherClient.subscribe(userChannel(user.id));

        // Pusher delivers JSON, so the date arrives as a string.
        const onNotification = (newNotification: Omit<Notification, 'createdAt'> & { createdAt: string }) => {
            const parsed = {
                ...newNotification,
                createdAt: new Date(newNotification.createdAt)
            };
            setNotifications(prev => [parsed, ...prev]);
            setUnreadCount(prev => prev + 1);
        };
        channel.bind('notification:new', onNotification);

        // Unbind this handler only. GlobalNotificationListener shares the
        // channel, and unsubscribing here (or there) dropped the other's
        // bindings, so live updates stopped after the first navigation.
        return () => {
            channel.unbind('notification:new', onNotification);
        };
    }, [user?.id]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    const handleMarkRead = async (id: string, currentlyRead: boolean) => {
        if (!currentlyRead) {
            // Optimistic update
            setNotifications(prev => prev.map(n =>
                n.id === id ? { ...n, read: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));

            await markNotificationAsRead(id);
        }
    };

    const handleMarkAllRead = async () => {
        // Optimistic
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        if (user?.id) {
            await markAllNotificationsAsRead();
        }
    };

    if (!user) return null;

    return (
        <div className={styles.bellContainer} ref={dropdownRef}>
            <button
                type="button"
                className={styles.bellButton}
                onClick={() => setIsOpen(!isOpen)}
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                aria-expanded={isOpen}
            >
                <Bell size={20} aria-hidden="true" />
                {unreadCount > 0 && (
                    <span className={styles.badge} aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    <div className={styles.header}>
                        <h3>
                            Notifications
                            {unreadCount > 0 && <span className={styles.count}>{unreadCount} new</span>}
                        </h3>
                        {unreadCount > 0 && (
                            <button
                                className={styles.markAllBtn}
                                onClick={handleMarkAllRead}
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className={styles.scrollArea}>
                        {loading ? (
                            <div className={styles.loading}>Loading notifications</div>
                        ) : notifications.length === 0 ? (
                            <div className={styles.empty}>
                                <strong>Nothing new yet.</strong>
                                <span>Sign-ups for your events, replies and reminders land here.</span>
                                <Link href="/events" onClick={() => setIsOpen(false)}>
                                    Browse events
                                </Link>
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={notification.read ? styles.item : `${styles.item} ${styles.unread}`}
                                    onClick={() => handleMarkRead(notification.id, notification.read)}
                                >
                                    <Link
                                        href={notification.link || '#'}
                                        className={styles.linkWrapper}
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <div className={styles.avatar}>
                                            {notification.actor?.avatar ? (
                                                <Image src={notification.actor.avatar} width={36} height={36} alt="" />
                                            ) : (
                                                <div className={styles.placeholderAvatar}>
                                                    {notification.actor?.name?.[0]?.toUpperCase() || 'C'}
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.content}>
                                            <p>
                                                <span className={styles.actorName}>{notification.actor?.name || 'Campus Connect'}</span>
                                                {' '}
                                                {notification.message}
                                            </p>
                                            <span className={styles.time}>
                                                {formatIST(notification.createdAt, { day: 'numeric', month: 'short' })}
                                            </span>
                                        </div>
                                        {!notification.read && <span className={styles.dot} aria-label="Unread" />}
                                    </Link>
                                </div>
                            ))
                        )}
                    </div>

                    <PushToggle compact className={styles.pushFooter} />
                </div>
            )}
        </div>
    );
}
