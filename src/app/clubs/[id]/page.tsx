import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import styles from './page.module.css';
import { getSession } from '@/lib/auth';
import { getClubDetails, getClubPosts } from '@/lib/actions';
import ClubAdminControls from '@/components/clubs/ClubAdminControls';
import JoinClubButton from '@/components/JoinClubButton';
import ClubFeed from '@/components/clubs/ClubFeed';
import { formatIST } from '@/lib/format';

const MEMBERS_SHOWN = 12;

export default async function ClubDetailsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    // Three independent reads, made together: one after another they were
    // three round trips to a database on another continent.
    const [club, session, posts] = await Promise.all([
        getClubDetails(params.id),
        getSession(),
        getClubPosts(params.id),
    ]);

    if (!club) {
        notFound();
    }

    /* These read `m.user.id`, not `m.userId`. The query selects the member row
       without its userId column, so the old `(m: any) => m.userId === ...`
       compared undefined against the session on every render: isMember and
       isAdmin were permanently false, which meant a member always saw "Join"
       and a club admin never saw the admin controls. The `any` is what let
       that compile. */
    const isAdmin = Boolean(
        session?.userId &&
            club.members.some((m) => m.user.id === session.userId && m.role === 'ADMIN')
    );
    const isMember = Boolean(
        session?.userId && club.members.some((m) => m.user.id === session.userId)
    );


    /* Every club used to render the same stock banner photograph and, when it
       had no logo, one of six stock images picked by character code — so two
       unrelated clubs could share a "logo" neither of them chose. A club shows
       its own mark or its initial. Nothing here is borrowed. */
    const logo =
        club.logo && (club.logo.startsWith('http') || club.logo.startsWith('/'))
            ? club.logo
            : null;

    const now = new Date();
    const events = [...club.events].sort((a, b) => +new Date(b.date) - +new Date(a.date));

    const colleges = new Set(
        club.members.map((m) => m.user.college?.name).filter(Boolean) as string[]
    );
    const shownMembers = club.members.slice(0, MEMBERS_SHOWN);
    const remaining = club.members.length - shownMembers.length;

    return (
        <div className={styles.page}>
            <Link href="/clubs" className={styles.back}>
                <ArrowLeft size={13} aria-hidden="true" />
                All clubs
            </Link>

            <header className={styles.masthead}>
                <div>
                    <div className={styles.eyebrow}>
                        <span className={styles.eyebrowInk}>{club.category}</span>
                        <span className={styles.eyebrowRule}>/</span>
                        <span>
                            {club._count.members}{' '}
                            {club._count.members === 1 ? 'member' : 'members'}
                        </span>
                        <span className={styles.eyebrowRule}>/</span>
                        <span>
                            {club._count.events} {club._count.events === 1 ? 'event' : 'events'}
                        </span>
                        {!club.verified && (
                            <span className={styles.unverified}>{club.rejectionReason ? 'Not approved' : 'Awaiting approval'}</span>
                        )}
                    </div>

                    <h1 className={styles.title}>{club.name}</h1>

                    {club.college?.name && (
                        <p className={styles.college}>{club.college.name}</p>
                    )}
                </div>

                <div className={styles.mark}>
                    {logo ? (
                        <Image src={logo} alt="" fill sizes="220px" />
                    ) : (
                        <span className={styles.markLetter} aria-hidden="true">
                            {club.name.charAt(0).toUpperCase()}
                        </span>
                    )}
                </div>
            </header>

            <div className={styles.controls}>
                {session?.userId && (
                    <JoinClubButton
                        clubId={club.id}
                        clubName={club.name}
                        isMember={isMember}
                        isAdmin={isAdmin}
                    />
                )}
                {isAdmin && <ClubAdminControls clubId={club.id} />}
            </div>

            <div className={styles.body}>
                <div>
                    <section className={styles.section}>
                        <p className={styles.sectionLabel}>About</p>
                        <p className={styles.description}>{club.description}</p>
                    </section>

                    <section className={styles.section}>
                        <p className={styles.sectionLabel}>Events</p>
                        {events.length > 0 ? (
                            <div className={styles.events}>
                                {events.map((event) => {
                                    const date = new Date(event.date);
                                    const past = date < now;
                                    return (
                                        <Link
                                            key={event.id}
                                            href={`/events/${event.id}`}
                                            className={`${styles.event} ${past ? styles.eventPast : ''}`}
                                        >
                                            <span className={styles.eventDate}>
                                                {formatIST(date, {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: '2-digit',
                                                })}
                                            </span>
                                            <span className={styles.eventTitle}>
                                                {event.title}
                                            </span>
                                            <span className={styles.eventTag}>
                                                {past ? 'Past' : event.category}
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className={styles.empty}>
                                This club has not scheduled anything yet.
                            </p>
                        )}
                    </section>

                    <section className={styles.section}>
                        <p className={styles.sectionLabel}>Feed</p>
                        <ClubFeed clubId={club.id} initialPosts={posts} isMember={isMember} />
                    </section>
                </div>

                <aside className={styles.rail}>
                    <div className={styles.railHead}>
                        <p className={styles.railTitle}>Members</p>
                        <span className={styles.railCount}>
                            {String(club._count.members).padStart(2, '0')}
                        </span>
                    </div>

                    {shownMembers.map((member) => (
                        <div key={member.id} className={styles.member}>
                            <span className={styles.memberAvatar} aria-hidden="true">
                                {member.user.name.charAt(0).toUpperCase()}
                            </span>
                            <div>
                                <p className={styles.memberName}>{member.user.name}</p>
                                <p className={styles.memberSub}>
                                    {member.role === 'ADMIN' ? 'Admin · ' : ''}
                                    {member.user.college?.name || 'Campus'}
                                </p>
                            </div>
                        </div>
                    ))}

                    {remaining > 0 && (
                        <p className={styles.more}>and {remaining} more</p>
                    )}

                    {/* Only worth saying when it is actually true of this club. */}
                    {colleges.size > 1 && (
                        <div className={styles.network}>
                            <p className={styles.networkText}>
                                Members from {colleges.size} colleges.
                            </p>
                            <div className={styles.networkList}>
                                {[...colleges].map((college) => (
                                    <span key={college} className={styles.networkChip}>
                                        {college}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}
