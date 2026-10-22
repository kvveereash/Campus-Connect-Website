'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowUpRight, Check, MapPin, Pencil, Plus, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import EventCard from '@/components/EventCard';
import EditCollegeModal from '@/components/colleges/EditCollegeModal';
import { resolveCollegeImage, resolveClubImage, getCollegePhotoCredit } from '@/lib/college-images';
import { inkFor } from '@/app/events/press';
import type { EventWithRelations } from '@/lib/actions';
import RevealGroup from '@/components/RevealGroup';
import styles from './page.module.css';

interface CollegeClub {
    id: string;
    name: string;
    logo: string | null;
    category: string;
    description: string;
    members: number;
}

interface CollegeClientProps {
    college: {
        id: string;
        name: string;
        location: string;
        logo: string;
        description: string;
    };
    events: EventWithRelations[];
    clubs: CollegeClub[];
    students: number;
}

/**
 * A college's page: its campus up top, what is going on there, and the
 * clubs that run it. Entrances are CSS, so nothing waits on JavaScript to
 * become visible.
 */
export default function CollegeClient({ college, events, clubs, students }: CollegeClientProps) {
    const { user, toggleFollow } = useAuth();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const isFollowing = user?.followedColleges?.includes(college.id);
    const canEdit = user?.role === 'COLLEGE_ADMIN' && user?.collegeId === college.id;
    const credit = getCollegePhotoCredit(college.name);
    const place = college.location && college.location !== 'Unspecified' ? college.location : null;

    return (
        <div className={styles.page}>
            <Link href="/colleges" className={styles.back}>
                <ArrowLeft size={14} aria-hidden="true" /> All colleges
            </Link>

            {/* ── Hero ── */}
            <section className={styles.hero}>
                <div className={styles.heroMedia}>
                    <Image
                        src={resolveCollegeImage(college)}
                        alt={`${college.name} campus`}
                        fill
                        priority
                        sizes="(max-width: 1200px) 100vw, 1200px"
                    />
                </div>
                <div className={styles.heroShade} aria-hidden="true" />

                <div className={styles.heroBody}>
                    <p className={styles.heroLabel}>College</p>
                    <h1 className={styles.heroTitle}>{college.name}</h1>
                    {place && (
                        <p className={styles.heroPlace}>
                            <MapPin size={14} aria-hidden="true" /> {place}
                        </p>
                    )}
                </div>

                {(user || canEdit) && (
                    <div className={styles.heroActions}>
                        {user && (
                            <button
                                type="button"
                                onClick={() => toggleFollow(college.id)}
                                className={`${styles.followBtn} ${isFollowing ? styles.following : ''}`}
                                aria-pressed={!!isFollowing}
                            >
                                {isFollowing ? <Check size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
                                {isFollowing ? 'Following' : 'Follow'}
                            </button>
                        )}
                        {canEdit && (
                            <button type="button" onClick={() => setIsEditModalOpen(true)} className={styles.editBtn}>
                                <Pencil size={14} aria-hidden="true" /> Edit
                            </button>
                        )}
                    </div>
                )}
            </section>

            {credit && (
                <p className={styles.photoCredit}>
                    Photo:{' '}
                    <a href={credit.source} target="_blank" rel="noopener noreferrer">
                        {credit.author}
                    </a>
                    , {credit.license}
                </p>
            )}

            {/* ── About + numbers ── */}
            <section className={styles.overview}>
                <div className={styles.about}>
                    <p className="mono-label">About</p>
                    <p className={styles.aboutText}>
                        {college.description || `${college.name} is on Campus Connect.`}
                    </p>
                </div>
                <dl className={styles.stats}>
                    <div className={styles.stat}>
                        <dt>
                            <span className={styles.square} style={{ background: 'var(--press-sports)' }} aria-hidden="true" />
                            Clubs
                        </dt>
                        <dd>{clubs.length}</dd>
                    </div>
                    <div className={styles.stat}>
                        <dt>
                            <span className={styles.square} style={{ background: 'var(--press-technology)' }} aria-hidden="true" />
                            Upcoming
                        </dt>
                        <dd>{events.length}</dd>
                    </div>
                    <div className={styles.stat}>
                        <dt>
                            <span className={styles.square} style={{ background: 'var(--press-cultural)' }} aria-hidden="true" />
                            Students
                        </dt>
                        <dd>{students}</dd>
                    </div>
                </dl>
            </section>

            {/* ── Events ── */}
            <section className={styles.section}>
                <div className={styles.sectionHead}>
                    <div>
                        <p className="mono-label">On the board</p>
                        <h2 className={styles.sectionTitle}>Upcoming events</h2>
                    </div>
                    <span className={styles.countPill}>{events.length} upcoming</span>
                </div>

                {events.length > 0 ? (
                    <RevealGroup className={styles.grid}>
                        {events.map((event) => (
                            <EventCard key={event.id} event={event} />
                        ))}
                    </RevealGroup>
                ) : (
                    <div className={styles.empty}>
                        <p className={styles.emptyTitle}>Nothing on the board yet.</p>
                        <p className={styles.emptyText}>
                            When a club at {college.name} posts an event, it shows up here.
                        </p>
                    </div>
                )}
            </section>

            {/* ── Clubs ── */}
            <section className={styles.section}>
                <div className={styles.sectionHead}>
                    <div>
                        <p className="mono-label">Societies</p>
                        <h2 className={styles.sectionTitle}>Clubs on campus</h2>
                    </div>
                    <span className={styles.countPill}>
                        {clubs.length} {clubs.length === 1 ? 'club' : 'clubs'}
                    </span>
                </div>

                {clubs.length > 0 ? (
                    <RevealGroup className={styles.grid}>
                        {clubs.map((club) => (
                            <Link key={club.id} href={`/clubs/${club.id}`} className={styles.clubCard}>
                                <div className={styles.clubMedia}>
                                    <Image
                                        src={resolveClubImage(club)}
                                        alt=""
                                        fill
                                        sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                                    />
                                    <span className={styles.clubCat}>
                                        <span
                                            className={styles.square}
                                            style={{ background: inkFor(club.category) }}
                                            aria-hidden="true"
                                        />
                                        {club.category}
                                    </span>
                                </div>
                                <div className={styles.clubBody}>
                                    <h3 className={styles.clubName}>{club.name}</h3>
                                    {club.description && <p className={styles.clubDesc}>{club.description}</p>}
                                    <span className={styles.clubFoot}>
                                        <span className={styles.members}>
                                            <Users size={14} aria-hidden="true" />
                                            {club.members} {club.members === 1 ? 'member' : 'members'}
                                        </span>
                                        <ArrowUpRight size={18} className={styles.clubArrow} aria-hidden="true" />
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </RevealGroup>
                ) : (
                    <div className={styles.empty}>
                        <p className={styles.emptyTitle}>No clubs here yet.</p>
                        <p className={styles.emptyText}>Start one and it will be the first on campus.</p>
                        <Link href="/clubs/create" className="btn btn-primary">
                            Start a club
                        </Link>
                    </div>
                )}
            </section>

            {isEditModalOpen && <EditCollegeModal college={college} onClose={() => setIsEditModalOpen(false)} />}
        </div>
    );
}
