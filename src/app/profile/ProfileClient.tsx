'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getAllColleges } from '@/lib/actions/colleges';
import { getUserCreatedEvents, getUserRegisteredEvents, type EventWithRelations } from '@/lib/actions/events';
import { getUserBadges } from '@/lib/actions';
import ProfileHeader, { BadgeType } from '@/components/profile/ProfileHeader';
import ProfessionalTab from '@/components/profile/ProfessionalTab';
import NetworkTab from '@/components/profile/NetworkTab';
import EditProfileModal from '@/components/profile/EditProfileModal';
import EventSection from '@/components/profile/EventSection';
import ProfileTabs from '@/components/profile/ProfileTabs';
import { College } from '@/types';
import styles from './page.module.css';

type Tab = 'Events' | 'Professional' | 'Network';
type HostedEvent = Awaited<ReturnType<typeof getUserCreatedEvents>>[number];

export default function ProfileClient() {
    const { user, updateProfile, logout, isLoading, isInitialized } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('Events');
    const [isEditOpen, setIsEditOpen] = useState(false);

    const [badges, setBadges] = useState<BadgeType[]>([]);
    const [followedColleges, setFollowedColleges] = useState<College[]>([]);
    const [registeredEvents, setRegisteredEvents] = useState<EventWithRelations[]>([]);
    const [hostedEvents, setHostedEvents] = useState<EventWithRelations[]>([]);
    const [isEventsLoading, setIsEventsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        getUserBadges(user.id).then(setBadges);

        const followedIds = user.followedColleges || [];
        if (followedIds.length > 0) {
            getAllColleges().then((colleges) => {
                setFollowedColleges(colleges.filter((c) => followedIds.includes(c.id)));
            });
        }

        const normalise = (e: HostedEvent): EventWithRelations => ({
            ...e,
            date: new Date(e.date),
            hostCollege: e.hostCollege || { id: 'unknown', name: 'Unknown', logo: '/hero.png' },
            registrationCount: e._count?.registrations ?? 0,
        });

        Promise.all([getUserRegisteredEvents(), getUserCreatedEvents(user.id)])
            .then(([registered, created]) => {
                setRegisteredEvents(registered.map(normalise));
                setHostedEvents(created.map(normalise));
            })
            .finally(() => setIsEventsLoading(false));
    }, [user]);

    useEffect(() => {
        if (isInitialized && !isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, isInitialized, router]);

    if (!isInitialized || isLoading || !user)
        return (
            <div className={styles.container} role="status" aria-busy="true">
                <p className={styles.cardKicker}>Loading your profile</p>
            </div>
        );

    const clubCount = user.clubMemberships?.length ?? user.joinedClubs?.length ?? 0;
    const workCount =
        (user.projects?.length ?? 0) + (user.achievements?.length ?? 0) + (user.portfolioLinks?.length ?? 0);

    return (
        <div className={styles.container}>
            <ProfileHeader
                user={user}
                badges={badges}
                counts={{ attending: registeredEvents.length, hosted: hostedEvents.length, clubs: clubCount }}
                onEdit={() => setIsEditOpen(true)}
                onLogout={() => {
                    logout();
                    router.push('/login');
                }}
            />

            <ProfileTabs<Tab>
                tabs={[
                    { key: 'Events', label: 'Events', count: registeredEvents.length + hostedEvents.length },
                    { key: 'Professional', label: 'Work', count: workCount },
                    { key: 'Network', label: 'Network', count: clubCount + followedColleges.length },
                ]}
                active={activeTab}
                onChange={setActiveTab}
            />

            <div
                key={activeTab}
                className={styles.content}
                role="tabpanel"
                id={`${activeTab.toLowerCase()}-panel`}
                aria-labelledby={`${activeTab.toLowerCase()}-tab`}
            >
                {activeTab === 'Events' && (
                    <>
                        <EventSection
                            kicker="Registered"
                            title="Going to"
                            events={registeredEvents}
                            loading={isEventsLoading}
                            empty={{
                                title: 'Nothing on your calendar.',
                                text: 'Register for an event and it lands here, with the date and the venue.',
                            }}
                            action={{ label: 'Find events', href: '/events' }}
                        />
                        <EventSection
                            kicker="Organised by you"
                            title="Hosting"
                            events={hostedEvents}
                            loading={isEventsLoading}
                            empty={{
                                title: 'You have not hosted anything yet.',
                                text: 'Post a meetup, a workshop or a fest night and students across campuses can sign up.',
                            }}
                            action={{ label: 'Host an event', href: '/events/create' }}
                        />
                    </>
                )}

                {activeTab === 'Professional' && <ProfessionalTab user={user} updateProfile={updateProfile} />}

                {activeTab === 'Network' && (
                    <NetworkTab user={user} followedColleges={followedColleges} />
                )}
            </div>

            <EditProfileModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                user={user}
                updateProfile={updateProfile}
            />
        </div>
    );
}
