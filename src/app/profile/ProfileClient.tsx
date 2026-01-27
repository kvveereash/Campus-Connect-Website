'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventContext';
import { useClubs } from '@/context/ClubContext';
import { COLLEGES } from '@/lib/data';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileHeader from '@/components/profile/ProfileHeader';
import HolographicCard from '@/components/profile/HolographicCard';
import ProfessionalTab from '@/components/profile/ProfessionalTab';
import NetworkTab from '@/components/profile/NetworkTab';
import EditProfileModal from '@/components/profile/EditProfileModal';
import { User } from '@/types';

import EventCard from '@/components/EventCard';
import EventCardSkeleton from '@/components/EventCardSkeleton';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/common/EmptyState';

// Helper component for different tab contents
const ProfileTabs = ({ activeTab, onTabChange }: { activeTab: string, onTabChange: (tab: string) => void }) => (
    <div className={styles.tabs} role="tablist" aria-label="Profile sections">
        {['Events', 'Professional', 'Network'].map((tab) => (
            <button
                key={tab}
                className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
                onClick={() => onTabChange(tab)}
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`${tab.toLowerCase()}-panel`}
                id={`${tab.toLowerCase()}-tab`}
            >
                {tab}
                {activeTab === tab && (
                    <motion.div
                        layoutId="activeTab"
                        className={styles.activeTabLine}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                )}
            </button>
        ))}
    </div>
);

import { getUserBadges } from '@/lib/actions';
import { BadgeType } from '@/components/profile/ProfileHeader';

export default function ProfileClient() {
    const { user, login, updateProfile, logout } = useAuth();
    const { events, isLoading: isEventsLoading } = useEvents();
    const { clubs } = useClubs();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('Events');
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Badge state
    const [badges, setBadges] = useState<BadgeType[]>([]);

    useEffect(() => {
        if (user) {
            getUserBadges(user.id).then((fetchedBadges: any) => {
                setBadges(fetchedBadges);
            });
        }
    }, [user]);

    // If no user, show loading or redirect
    useEffect(() => {
        if (!user) {
            // BUT, since I have to output tool calls now, I will use what I know.
            // Wait, I can just fix the ProfileHeader props first.
        }
    }, [user, login]);

    if (!user) return <div role="status" aria-busy="true">Loading...</div>;

    // Derived Data with enrichment
    const registeredIds = user.registrations?.map(r => r.eventId) || [];
    const registeredEvents = events
        .filter((e) => registeredIds.includes(e.id))
        .map(e => {
            const college = COLLEGES.find(c => c.id === e.hostCollegeId);
            return {
                ...e,
                date: new Date(e.date),
                hostCollege: college || { id: 'unknown', name: 'Unknown', logo: '/hero.png' }
            };
        }) as any[]; // Cast to any to satisfy EventCard props for now

    const hostedEvents = events
        .filter((e) => e.hostCollegeId === user.collegeId)
        .map(e => {
            const college = COLLEGES.find(c => c.id === e.hostCollegeId);
            return {
                ...e,
                date: new Date(e.date),
                hostCollege: college || { id: 'unknown', name: 'Unknown', logo: '/hero.png' }
            };
        }) as any[];

    // Logic for Followed Colleges
    const followedCollegeIds = user.followedColleges || [];
    const followedColleges = COLLEGES.filter(c => followedCollegeIds.includes(c.id));

    return (
        <div className={styles.container}>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{ marginBottom: '2rem' }}
            >
                <ProfileHeader
                    user={user}
                    badges={badges}
                    onEdit={() => setIsEditOpen(true)}
                    onLogout={() => {
                        logout();
                        router.push('/login');
                    }}
                />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
                <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
            </motion.div>

            <motion.div
                className={styles.content}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
                <AnimatePresence mode="wait">
                    {activeTab === 'Events' && (
                        <motion.div
                            key="events"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            role="tabpanel"
                            id="events-panel"
                            aria-labelledby="events-tab"
                        >
                            <div className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <h3 className={styles.cardTitle}>Registered Events</h3>
                                </div>

                                {isEventsLoading ? (
                                    <div className={styles.eventsGrid}>
                                        <EventCardSkeleton />
                                        <EventCardSkeleton />
                                    </div>
                                ) : (
                                    <>
                                        {registeredEvents.length > 0 && (
                                            <div className={styles.eventsGrid}>
                                                {registeredEvents.map((event, index) => (
                                                    <motion.div
                                                        key={event.id}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: index * 0.1 }}
                                                    >
                                                        <EventCard event={event} />
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                        <div className={styles.actionRow} style={registeredEvents.length > 0 ? { gridColumn: '1 / -1' } : {}}>
                                            {registeredEvents.length === 0 && (
                                                <div className="w-full">
                                                    <EmptyState
                                                        title="No Upcoming Events"
                                                        description="You haven't registered for any upcoming events yet."
                                                        compact={true}
                                                        actionLabel="Explore Events"
                                                        actionLink="/events"
                                                    />
                                                </div>
                                            )}
                                            {registeredEvents.length > 0 && (
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => router.push('/events')}
                                                >
                                                    Explore Events
                                                </Button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className={styles.card} style={{ marginTop: '2rem' }}>
                                <div className={styles.cardHeader}>
                                    <h3 className={styles.cardTitle}>Hosted Events</h3>
                                </div>

                                {isEventsLoading ? (
                                    <div className={styles.eventsGrid}>
                                        <EventCardSkeleton />
                                    </div>
                                ) : (
                                    <>
                                        {hostedEvents.length > 0 && (
                                            <div className={styles.eventsGrid}>
                                                {hostedEvents.map((event, index) => (
                                                    <motion.div
                                                        key={event.id}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: index * 0.1 }}
                                                    >
                                                        <EventCard event={event} />
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                        <div className={styles.actionRow} style={hostedEvents.length > 0 ? { gridColumn: '1 / -1' } : {}}>
                                            {hostedEvents.length === 0 && (
                                                <div className="w-full">
                                                    <EmptyState
                                                        title="No Hosted Events"
                                                        description="You haven't hosted any events yet."
                                                        compact={true}
                                                        actionLabel="Host an Event"
                                                        actionLink="/events/create"
                                                    />
                                                </div>
                                            )}
                                            {hostedEvents.length > 0 && (
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => router.push('/events/create')}
                                                >
                                                    Host an Event
                                                </Button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'Professional' && (
                        <motion.div
                            key="professional"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.4 }}
                            role="tabpanel"
                            id="professional-panel"
                            aria-labelledby="professional-tab"
                        >
                            <ProfessionalTab user={user} updateProfile={updateProfile} />
                        </motion.div>
                    )}

                    {activeTab === 'Network' && (
                        <motion.div
                            key="network"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.4 }}
                            role="tabpanel"
                            id="network-panel"
                            aria-labelledby="network-tab"
                        >
                            <NetworkTab
                                user={user}
                                clubs={clubs}
                                followedColleges={followedColleges}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <EditProfileModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                user={user}
                updateProfile={updateProfile}
            />
        </div>
    );
}
