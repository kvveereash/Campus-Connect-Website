'use client';

import Image from 'next/image';
import { User, Club, College } from '@/types';
import styles from '@/app/profile/page.module.css';
import EmptyState from '@/components/common/EmptyState';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface NetworkTabProps {
    user: User;
    clubs: Club[];
    followedColleges: College[];
}

export default function NetworkTab({ user, clubs, followedColleges }: NetworkTabProps) {
    const router = useRouter();

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
        >
            {/* Joined Clubs */}
            <div className={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 className={styles.cardTitle} style={{ marginBottom: 0 }}>My Clubs</h3>
                    <button
                        onClick={() => router.push('/clubs/create')}
                        className="btn btn-outline"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                    >
                        + Create Club
                    </button>
                </div>

                {user.clubMemberships && user.clubMemberships.length > 0 ? (
                    <div className={styles.networkGrid}>
                        {user.clubMemberships.map(membership => (
                            <div key={membership.clubId} className={styles.networkCard} onClick={() => router.push(`/clubs/${membership.clubId}`)}>
                                {membership.club?.logo ? (
                                    <Image
                                        src={membership.club.logo}
                                        alt=""
                                        width={48}
                                        height={48}
                                        className={styles.miniLogo}
                                        style={{ objectFit: 'cover' }}
                                    />
                                ) : (
                                    <div className={styles.miniLogo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--primary)', color: 'white' }}>
                                        {membership.club?.name.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{membership.club?.name}</h4>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{membership.role}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className={styles.empty}>You aren't a member of any clubs yet.</p>
                )}
            </div>

            {/* Following Colleges */}
            <div className={styles.card}>
                <h3 className={styles.cardTitle} style={{ marginBottom: '1rem' }}>Colleges Following</h3>
                {followedColleges.length > 0 ? (
                    <div className={styles.networkGrid}>
                        {followedColleges.map((college) => (
                            <div key={college.id} className={styles.networkCard} onClick={() => router.push(`/colleges/${college.id}`)}>
                                <Image
                                    src={college.logo}
                                    alt=""
                                    width={48}
                                    height={48}
                                    className={styles.miniLogo}
                                />
                                <div>
                                    <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{college.name}</h4>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>University</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className={styles.empty}>You are not following any colleges.</p>
                )}
            </div>

            {/* Following Users */}
            <div className={styles.card}>
                <h3 className={styles.cardTitle} style={{ marginBottom: '1rem' }}>People Following</h3>
                <div className={styles.networkGrid}>
                    {user.following && user.following.length > 0 ? (
                        user.following.map(userId => (
                            <div key={userId} className={styles.networkCard} onClick={() => router.push(`/user/${userId}`)}>
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-color)',
                                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold'
                                }}>
                                    U{userId.replace('u', '')}
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>User {userId}</h4>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Student</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <EmptyState title="No Connections" description="Connect with other students." icon="👥" />
                    )}
                </div>
            </div>
        </motion.div>
    );
}
