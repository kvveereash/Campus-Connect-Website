'use client';

import { use, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { MOCK_USER, COLLEGES } from '@/lib/data';
import { useEvents } from '@/context/EventContext';
import EventCard from '@/components/EventCard';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import styles from '../page.module.css';

// Mock function to simulate fetching any user by ID
// In a real app, this would be an API call
const getUserById = (id: string) => {
    // For demo, we just return the current mock user if ID matches, 
    // or a generic one if it's different to show functionality
    if (id === MOCK_USER.id) return MOCK_USER;
    return {
        ...MOCK_USER,
        id: id,
        name: 'Visiting Student',
        email: 'visitor@college.edu',
        collegeId: 'c2'
    };
};

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { events } = useEvents();
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'registered' | 'hosted' | 'professional'>('registered');

    useEffect(() => {
        if (id) {
            setUser(getUserById(id));
        }
    }, [id]);

    if (!user) return <div className="p-8 text-center">Loading profile...</div>;

    const registeredEvents = events
        .filter((e) => user.registeredEvents?.includes(e.id))
        .map(e => {
            const college = COLLEGES.find(c => c.id === e.hostCollegeId);
            return {
                ...e,
                date: new Date(e.date),
                hostCollege: college || { id: 'unknown', name: 'Unknown', logo: '/hero.png' }
            };
        }) as any[];

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

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header Card */}
            <div className={`card ${styles.profileHeader}`}>
                <div className={styles.avatar}>
                    {user.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-3">
                        <h1 className={styles.name}>{user.name}</h1>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">Public View</span>
                    </div>
                    <p className={styles.details}>
                        {user.email} • {user.department} • {user.year}
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
                        <p className={styles.college}>
                            {COLLEGES.find(c => c.id === user.collegeId)?.name || 'Unknown University'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Activity Heatmap */}
            <ActivityHeatmap
                dates={[
                    ...registeredEvents.map(e => e.date),
                    ...hostedEvents.map(e => e.date)
                ]}
            />

            {/* Tabs */}
            <div className={styles.tabsContainer} style={{ margin: '2rem 0 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '2rem' }}>
                <button
                    className={styles.tabBtn}
                    style={{
                        background: 'none', border: 'none', padding: '0.75rem 0', fontSize: '1rem',
                        fontWeight: activeTab === 'registered' ? 600 : 500,
                        color: activeTab === 'registered' ? 'var(--primary-color)' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'registered' ? '2px solid var(--primary-color)' : 'transparent',
                        cursor: 'pointer'
                    }}
                    onClick={() => setActiveTab('registered')}
                >
                    Registered Events
                </button>
                <button
                    className={styles.tabBtn}
                    style={{
                        background: 'none', border: 'none', padding: '0.75rem 0', fontSize: '1rem',
                        fontWeight: activeTab === 'professional' ? 600 : 500,
                        color: activeTab === 'professional' ? 'var(--primary-color)' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'professional' ? '2px solid var(--primary-color)' : 'transparent',
                        cursor: 'pointer'
                    }}
                    onClick={() => setActiveTab('professional')}
                >
                    Professional
                </button>
            </div>

            {/* Content Area */}
            <div style={{ minHeight: '300px' }}>
                {activeTab === 'registered' && (
                    <div className={styles.grid}>
                        {registeredEvents.length > 0 ? (
                            registeredEvents.map((event) => (
                                <EventCard key={event.id} event={event} />
                            ))
                        ) : (
                            <p className={styles.empty}>No upcoming events registered.</p>
                        )}
                    </div>
                )}

                {activeTab === 'professional' && (
                    <div className="space-y-6">
                        {/* Resume Section */}
                        {user.resumeUrl && (
                            <div className="card bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">📄 Resume</h3>
                                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="w-10 h-10 bg-red-100 text-red-600 rounded flex items-center justify-center font-bold text-xs">PDF</div>
                                    <div>
                                        <div className="font-medium">Resume.pdf</div>
                                        <div className="text-xs text-blue-600 hover:underline cursor-pointer">Download</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Achievements Section */}
                        <div className="card bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">🏆 Achievements</h3>
                            <div className="space-y-3">
                                {(user.achievements && user.achievements.length > 0) ? (
                                    user.achievements.map((ach: any) => (
                                        <div key={ach.id} className="p-3 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-lg">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-semibold text-gray-900 dark:text-gray-100">{ach.title}</h4>
                                                <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">{ach.date}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{ach.description}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-400 text-sm">No achievements public yet.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
