'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import EventCard from '@/components/EventCard';
import styles from './page.module.css';
import { resolveCollegeImage } from '@/lib/college-images';
import { EventWithRelations } from '@/lib/actions';
import EditCollegeModal from '@/components/colleges/EditCollegeModal';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/Button';

interface CollegeClientProps {
    college: {
        id: string;
        name: string;
        location: string;
        logo: string;
        description: string;
    };
    events: EventWithRelations[];
    clubs?: any[];
}

export default function CollegeClient({ college, events, clubs = [] }: CollegeClientProps) {
    const { user, toggleFollow } = useAuth();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const isFollowing = user?.followedColleges?.includes(college.id);

    return (
        <div className={styles.container}>
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Link href="/colleges" className={styles.backLink}>
                    ← Back to Colleges
                </Link>
            </motion.div>

            <motion.div
                className={styles.headerCard}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
                <div className={styles.headerContent}>
                    <div className={styles.logoColumn}>
                        <motion.div
                            className={styles.logoWrapper}
                            initial={{ filter: 'grayscale(1)', opacity: 0 }}
                            animate={{ filter: 'grayscale(0)', opacity: 1 }}
                            transition={{ delay: 0.4, duration: 1 }}
                        >
                            <Image
                                src={resolveCollegeImage(college)}
                                alt={`${college.name} photo`}
                                fill
                                className={styles.logo}
                            />
                        </motion.div>
                    </div>

                    <div className={styles.info}>
                        <motion.h1
                            className={styles.name}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            {college.name}
                        </motion.h1>

                        <motion.div
                            className={styles.location}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            <span className={styles.locationPin}>📍</span> {college.location}
                        </motion.div>

                        <motion.p
                            className={styles.description}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                        >
                            {college.description}
                        </motion.p>

                        <motion.div
                            className={styles.actionRow}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7 }}
                        >
                            {user && (
                                <Button
                                    onClick={() => toggleFollow(college.id)}
                                    variant={isFollowing ? 'outline' : 'primary'}
                                    size="sm"
                                    leftIcon={isFollowing ? '✓' : '＋'}
                                >
                                    {isFollowing ? 'Following' : 'Follow College'}
                                </Button>
                            )}

                            {user?.role === 'COLLEGE_ADMIN' && user?.collegeId === college.id && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setIsEditModalOpen(true)}
                                    leftIcon="✏️"
                                >
                                    Edit Profile
                                </Button>
                            )}
                        </motion.div>
                    </div>
                </div>
            </motion.div>

            {isEditModalOpen && (
                <EditCollegeModal
                    college={college}
                    onClose={() => setIsEditModalOpen(false)}
                />
            )}

            <motion.div
                className={styles.section}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
            >
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Student Communities</h2>
                    <span className={styles.itemCount}>{clubs.length} Clubs</span>
                </div>

                {clubs && clubs.length > 0 ? (
                    <div className={styles.grid}>
                        {clubs.map((club, index) => (
                            <motion.div
                                key={club.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + (index * 0.1) }}
                            >
                                <Link href={`/clubs/${club.id}`} className={styles.clubCard}>
                                    <div className={styles.clubImageWrapper}>
                                        {club.image || club.logo ? (
                                            <Image
                                                src={club.image || club.logo}
                                                alt={club.name}
                                                fill
                                                className={styles.clubImage}
                                            />
                                        ) : (
                                            <div className={styles.noImage}>No Image</div>
                                        )}
                                        <div className={styles.categoryBadge}>{club.category}</div>
                                    </div>
                                    <div className={styles.clubInfo}>
                                        <h3 className={styles.clubName}>{club.name}</h3>
                                        <p className={styles.viewLink}>View Community →</p>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <p>No clubs active at {college.name} yet.</p>
                    </div>
                )}
            </motion.div>

            <motion.div
                className={styles.section}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
            >
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Hosted Events</h2>
                    <span className={styles.itemCount}>{events.length} Upcoming</span>
                </div>

                {events.length > 0 ? (
                    <div className={styles.grid}>
                        {events.map((event, index) => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.7 + (index * 0.1) }}
                            >
                                <EventCard event={event} index={index} />
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <p>No upcoming events listed for {college.name} yet.</p>
                    </div>
                )}
            </motion.div>
        </div>
    );
}

