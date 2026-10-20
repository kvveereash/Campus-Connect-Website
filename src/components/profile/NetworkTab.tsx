'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Building2, Plus, Users } from 'lucide-react';
import { User, Club, College } from '@/types';
import { resolveClubImage, resolveCollegeImage } from '@/lib/college-images';
import styles from '@/app/profile/page.module.css';

interface NetworkTabProps {
    user: User;
    clubs: Club[];
    followedColleges: College[];
}

/** Clubs you belong to and colleges you follow, as tiles. */
export default function NetworkTab({ user, followedColleges }: NetworkTabProps) {
    const memberships = user.clubMemberships ?? [];

    return (
        <>
            <section className={styles.card}>
                <div className={styles.cardHeader}>
                    <div>
                        <span className={styles.cardKicker}>Member of</span>
                        <h2 className={styles.cardTitle}>
                            <Users size={18} aria-hidden="true" /> My clubs
                            <span className={styles.countPill}>{memberships.length}</span>
                        </h2>
                    </div>
                    <Link href="/clubs/create" className={styles.headLink}>
                        <Plus size={14} aria-hidden="true" /> Start a club
                    </Link>
                </div>

                {memberships.length > 0 ? (
                    <div className={styles.networkGrid}>
                        {memberships.map((m) => (
                            <Link key={m.clubId} href={`/clubs/${m.clubId}`} className={styles.networkCard}>
                                <Image
                                    src={resolveClubImage({ name: m.club?.name ?? '', logo: m.club?.logo ?? null, category: m.club?.category ?? '' })}
                                    alt=""
                                    width={44}
                                    height={44}
                                    className={styles.miniLogo}
                                />
                                <span className={styles.networkText}>
                                    <span className={styles.networkName}>{m.club?.name}</span>
                                    <span className={styles.networkMeta}>{m.role.toLowerCase()}</span>
                                </span>
                                <ArrowRight size={15} className={styles.networkArrow} aria-hidden="true" />
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className={`${styles.empty} ${styles.emptyBox}`}>
                        <p className={styles.emptyTitle}>No clubs yet.</p>
                        <p>Join a club and it shows up here.</p>
                        <Link href="/clubs" className={styles.headLink}>
                            Browse clubs <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                    </div>
                )}
            </section>

            <section className={styles.card}>
                <div className={styles.cardHeader}>
                    <div>
                        <span className={styles.cardKicker}>Following</span>
                        <h2 className={styles.cardTitle}>
                            <Building2 size={18} aria-hidden="true" /> Colleges
                            <span className={styles.countPill}>{followedColleges.length}</span>
                        </h2>
                    </div>
                </div>

                {followedColleges.length > 0 ? (
                    <div className={styles.networkGrid}>
                        {followedColleges.map((college) => (
                            <Link key={college.id} href={`/colleges/${college.id}`} className={styles.networkCard}>
                                <Image
                                    src={resolveCollegeImage(college)}
                                    alt=""
                                    width={44}
                                    height={44}
                                    className={styles.miniLogo}
                                />
                                <span className={styles.networkText}>
                                    <span className={styles.networkName}>{college.name}</span>
                                    {college.location && college.location !== 'Unspecified' && (
                                        <span className={styles.networkMeta}>{college.location}</span>
                                    )}
                                </span>
                                <ArrowRight size={15} className={styles.networkArrow} aria-hidden="true" />
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className={`${styles.empty} ${styles.emptyBox}`}>
                        <p className={styles.emptyTitle}>Not following any colleges.</p>
                        <p>Follow a campus to see its events first.</p>
                        <Link href="/colleges" className={styles.headLink}>
                            Browse colleges <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                    </div>
                )}
            </section>
        </>
    );
}
