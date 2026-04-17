import { notFound } from 'next/navigation';
import Image from 'next/image';
import styles from './page.module.css';
import { getSession } from '@/lib/auth';
import { getClubDetails, getClubPosts } from '@/lib/actions';
import ClubAdminControls from '@/components/clubs/ClubAdminControls';
import JoinClubButton from '@/components/JoinClubButton';
import ClubFeed from '@/components/clubs/ClubFeed';
import { MapPin, Layers, Users, Calendar, MessageSquare, Info } from 'lucide-react';

export default async function ClubDetailsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const club = await getClubDetails(params.id);

    if (!club) {
        notFound();
    }

    const session = await getSession();
    const isAdmin = session?.userId && club.members.some((m: any) => m.userId === session.userId && m.role === 'ADMIN');
    const isMember = session?.userId && club.members.some((m: any) => m.userId === session.userId);

    const posts = await getClubPosts(club.id);

    const FALLBACK_BANNER = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2000';
    const FALLBACK_IMAGES = [
        'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=1000',
        'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=1000',
        'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=1000',
        'https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=1000',
        'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=1000',
        'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=1000'
    ];
    const fallbackImage = FALLBACK_IMAGES[(club.name.charCodeAt(0) + club.id.charCodeAt(0)) % FALLBACK_IMAGES.length];
    const displayImage = (club.logo && (club.logo.startsWith('http') || club.logo.startsWith('/'))) ? club.logo : fallbackImage;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.banner}>
                    <Image
                        src={FALLBACK_BANNER}
                        alt="Banner"
                        fill
                        className={styles.bannerImage}
                        priority
                    />
                </div>
            </div>

            <div className={styles.clubInfoCard}>
                <div className={styles.logoWrapper}>
                    <Image
                        src={displayImage}
                        alt={club.name}
                        width={180}
                        height={180}
                        className={styles.clubLogo}
                        style={{ objectFit: 'cover' }}
                    />
                </div>
                <div className={styles.headerContent}>
                    <div className={styles.categoryTag}>
                        <Layers size={14} />
                        {club.category}
                    </div>
                    <h1 className={styles.title}>{club.name}</h1>
                    <div className={styles.collegeName}>
                        <MapPin size={18} className="text-secondary" />
                        <span>{club.college?.name}</span>
                    </div>
                    <div className={styles.controls}>
                        {session?.userId && (
                            <JoinClubButton
                                clubId={club.id}
                                clubName={club.name}
                                isMember={!!isMember}
                                isAdmin={!!isAdmin}
                            />
                        )}
                        {isAdmin && <ClubAdminControls clubId={club.id} />}
                    </div>
                </div>
            </div>

            <div className={styles.grid}>
                <div className={styles.mainContent}>
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <Info size={24} color="#0F1F1C" />
                            <h2 className={styles.sectionTitle}>About the Club</h2>
                        </div>
                        <div className={styles.card}>
                            <p className={styles.description}>{club.description}</p>
                        </div>
                    </section>

                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <Calendar size={24} color="#0F1F1C" />
                            <h2 className={styles.sectionTitle}>Upcoming Events</h2>
                        </div>
                        {club.events.length > 0 ? (
                            <div className={styles.eventsGrid}>
                                {club.events.map(event => (
                                    <div key={event.id} className={styles.eventCard}>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{event.title}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                                            <Calendar size={14} />
                                            <span style={{ fontSize: '0.9rem' }}>
                                                {new Date(event.date).toLocaleDateString(undefined, {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                <Calendar size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                <p>No events scheduled yet. Stay tuned!</p>
                            </div>
                        )}
                    </section>

                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <MessageSquare size={24} color="#0F1F1C" />
                            <h2 className={styles.sectionTitle}>Community Feed</h2>
                        </div>
                        <ClubFeed clubId={club.id} initialPosts={posts} isMember={!!isMember} />
                    </section>
                </div>

                <div className={styles.sidebar}>
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <Users size={24} color="#0F1F1C" />
                            <h2 className={styles.sectionTitle}>
                                Members
                                <span style={{ marginLeft: 'auto', fontSize: '0.85rem', background: 'var(--color-forest)', color: 'white', padding: '0.2rem 0.8rem', borderRadius: '999px', fontWeight: '600' }}>
                                    {club._count?.members || 0}
                                </span>
                            </h2>
                        </div>
                        <div className={styles.memberList}>
                            {club.members.map(member => (
                                <div key={member.id} className={styles.memberItem}>
                                    <div className={styles.memberAvatar}>
                                        {member.user.name.charAt(0)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p className={styles.memberName}>{member.user.name}</p>
                                        <p className={styles.memberSub}>
                                            {member.role === 'ADMIN' ? '⚡ ' : ''}{member.user.college?.name || 'Campus'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {(() => {
                        const colleges = new Set(club.members.map((m: any) => m.user.college?.name).filter(Boolean));
                        const isCollaborative = colleges.size > 1;

                        if (isCollaborative) {
                            return (
                                <section className={styles.card} style={{ border: '1px solid rgba(15, 31, 28, 0.08)', background: 'linear-gradient(135deg, rgba(209, 250, 229, 0.3), rgba(224, 192, 248, 0.15))' }}>
                                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)', color: 'var(--color-forest)' }}>
                                        🤝 Multi-College Network
                                    </h3>
                                    <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                                        Bringing together students from <strong>{colleges.size}</strong> institutions.
                                    </p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {Array.from(colleges).map((college: any) => (
                                            <span key={college} style={{
                                                fontSize: '0.75rem', padding: '4px 12px', borderRadius: '999px',
                                                background: 'white', border: '1px solid rgba(15, 31, 28, 0.1)', color: 'var(--color-forest)', fontWeight: 600
                                            }}>
                                                {college}
                                            </span>
                                        ))}
                                    </div>
                                </section>
                            );
                        }
                        return null;
                    })()}
                </div>
            </div>
        </div>
    );
}
