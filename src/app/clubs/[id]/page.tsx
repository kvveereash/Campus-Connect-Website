import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import styles from './page.module.css';
import { getSession } from '@/lib/auth';
import { getClubDetails, getClubPosts } from '@/lib/actions';
import ClubAdminControls from '@/components/clubs/ClubAdminControls';
import JoinClubButton from '@/components/JoinClubButton';
import ClubFeed from '@/components/clubs/ClubFeed';
import RecruitmentApply from '@/components/clubs/RecruitmentApply';
import RecruitmentQuestions from '@/components/clubs/RecruitmentQuestions';
import RecruitmentSettings from '@/components/clubs/RecruitmentSettings';
import ApplicationList from '@/components/clubs/ApplicationList';
import ReportButton from '@/components/ReportButton';
import EmbedCode from '@/components/EmbedCode';
import { formatIST } from '@/lib/format';
import { shareMetadata } from '@/lib/site';
import { authHref } from '@/lib/utils';
import { getClubRecruitment } from '@/lib/recruitment';
import { getApplications, getMyApplication } from '@/lib/actions/recruitment';

const MEMBERS_SHOWN = 12;

const summary = (text: string) => (text.length > 155 ? `${text.slice(0, 152)}…` : text);

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await props.params;
    const club = await getClubDetails(id);
    if (!club) return { title: 'Club not found' };
    const description = summary(club.description);
    return {
        title: club.name,
        description,
        ...shareMetadata({ title: club.name, description, path: `/clubs/${id}` }),
    };
}

export default async function ClubDetailsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    // Independent reads, made together: one after another they were a round
    // trip each to a database on another continent. The two recruitment
    // actions check the viewer themselves (a signed-out visitor costs no
    // query, a non-admin gets no applications), which is cheaper than a
    // second round trip once isAdmin is known.
    const [club, session, posts, recruitment, mine, submitted] = await Promise.all([
        getClubDetails(params.id),
        getSession(),
        getClubPosts(params.id),
        getClubRecruitment(params.id),
        getMyApplication(params.id),
        getApplications(params.id),
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

    const myApplication = !isAdmin && mine.success ? mine.data : null;
    const applications = isAdmin && submitted.success ? submitted.data : [];
    const waiting = applications.filter((a) => a.status === 'PENDING').length;
    // After applications close, a student still waiting on an answer keeps
    // seeing where they stand; a decided one no longer needs the band.
    const showRecruiting = recruitment.recruiting || myApplication?.status === 'PENDING';
    const dayMonth = (iso: string) => formatIST(iso, { day: 'numeric', month: 'long' });

    // What the Recruiting band offers depends on who is looking.
    let recruitAction: ReactNode = null;
    if (myApplication) {
        const decidedOn = dayMonth(myApplication.decidedAt ?? myApplication.createdAt);
        recruitAction = (
            <div className={styles.recruitStatus}>
                <span
                    className={`${styles.recruitChip} ${
                        myApplication.status === 'ACCEPTED'
                            ? styles.recruitChipAccepted
                            : myApplication.status === 'DECLINED'
                              ? styles.recruitChipDeclined
                              : ''
                    }`}
                >
                    {myApplication.status === 'PENDING'
                        ? 'Application sent'
                        : myApplication.status === 'ACCEPTED'
                          ? 'Accepted'
                          : 'Declined'}
                </span>
                <p className={styles.recruitNote}>
                    {myApplication.status === 'PENDING'
                        ? `Sent ${dayMonth(myApplication.createdAt)}. The club’s admins will reply in your notifications.`
                        : myApplication.status === 'ACCEPTED'
                          ? `Accepted ${decidedOn}. You are a member of ${club.name}.`
                          : `The club’s admins declined this application on ${decidedOn}. You can still follow its events and posts here.`}
                </p>
                {myApplication.answers.length > 0 && (
                    <details className={styles.recruitSent}>
                        <summary>What you sent</summary>
                        <dl>
                            {myApplication.answers.map((item, i) => (
                                <div key={i}>
                                    <dt>{item.question}</dt>
                                    <dd>{item.answer}</dd>
                                </div>
                            ))}
                        </dl>
                    </details>
                )}
            </div>
        );
    } else if (isAdmin) {
        recruitAction = (
            <>
                <RecruitmentQuestions questions={recruitment.questions} />
                <div className={styles.recruitAction}>
                    <a href="#applications" className={styles.recruitButton}>
                        Review applications
                    </a>
                    <span className={styles.recruitMeta}>{waiting} waiting</span>
                </div>
            </>
        );
    } else if (isMember) {
        recruitAction = (
            <>
                <RecruitmentQuestions questions={recruitment.questions} />
                <p className={styles.recruitNote}>
                    You are already a member. Send this page to someone who should apply.
                </p>
            </>
        );
    } else if (!session?.userId) {
        recruitAction = (
            <>
                <RecruitmentQuestions questions={recruitment.questions} />
                <div className={styles.recruitAction}>
                    <Link href={authHref(`/clubs/${club.id}`)} className={styles.recruitButton}>
                        Sign in to apply
                    </Link>
                    <span className={styles.recruitMeta}>You come straight back here</span>
                </div>
            </>
        );
    } else if (!club.verified) {
        recruitAction = (
            <>
                <RecruitmentQuestions questions={recruitment.questions} />
                <p className={styles.recruitNote}>Students can apply once the club is approved.</p>
            </>
        );
    } else {
        recruitAction = (
            <RecruitmentApply clubId={club.id} clubName={club.name} questions={recruitment.questions} />
        );
    }

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

            {/* Per-viewer actions on the club as a whole sit in this row. */}
            <div className={styles.controls}>
                {/* While a club is recruiting the way in is the application:
                    a Join button beside it would skip the club's questions. */}
                {session?.userId && (isMember || !recruitment.recruiting) && (
                    <JoinClubButton
                        clubId={club.id}
                        clubName={club.name}
                        isMember={isMember}
                        isAdmin={isAdmin}
                    />
                )}
                {isAdmin && <ClubAdminControls clubId={club.id} />}
                {!isAdmin && club.verified && (
                    <span className={styles.report}>
                        <ReportButton targetType="CLUB" targetId={club.id} label="Report this club" />
                    </span>
                )}
            </div>

            {showRecruiting && (
                <section className={styles.recruit} aria-labelledby="recruit-title">
                    <div>
                        <span
                            className={`${styles.recruitTag} ${
                                recruitment.recruiting ? '' : styles.recruitTagClosed
                            }`}
                        >
                            {recruitment.recruiting ? 'Recruiting' : 'Applications closed'}
                        </span>
                        <h2 id="recruit-title" className={styles.recruitTitle}>
                            {myApplication ? (
                                <>
                                    Your <em className="accent">application</em>
                                </>
                            ) : (
                                <>
                                    Applications are <em className="accent">open</em>
                                </>
                            )}
                        </h2>
                        {!myApplication && (
                            <p className={styles.recruitText}>
                                {recruitment.questions.length === 1
                                    ? 'Answer one question.'
                                    : `Answer ${recruitment.questions.length} short questions.`}{' '}
                                The club’s admins read each application and reply in your
                                notifications.
                            </p>
                        )}
                    </div>
                    <div className={styles.recruitBody}>{recruitAction}</div>
                </section>
            )}

            <div className={styles.body}>
                <div>
                    <section className={styles.section}>
                        <p className={styles.sectionLabel}>About</p>
                        <p className={styles.description}>{club.description}</p>
                    </section>

                    {isAdmin && (
                        <section className={`${styles.section} ${styles.anchor}`} id="recruitment">
                            <p className={styles.sectionLabel}>Recruitment</p>
                            {/* Keyed on the saved questions, so after a save the
                                fields show what was stored, cleaned. */}
                            <RecruitmentSettings
                                key={recruitment.questions.join('\n')}
                                clubId={club.id}
                                recruiting={recruitment.recruiting}
                                questions={recruitment.questions}
                            />
                            <ApplicationList
                                clubId={club.id}
                                recruiting={recruitment.recruiting}
                                applications={applications}
                            />
                        </section>
                    )}

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

                    {isAdmin && club.verified && (
                        <section className={styles.section}>
                            <EmbedCode kind="club" id={club.id} />
                        </section>
                    )}

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
