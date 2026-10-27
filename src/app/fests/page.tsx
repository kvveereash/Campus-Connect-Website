import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { shareMetadata } from '@/lib/site';
import { getFestBoard, type FestCard } from './data';
import { festDateRange, festLength, festPhase } from './rules';
import styles from './fests.module.css';

// The same board for everyone; rebuilt at most once a minute, and at once
// when a fest is approved or edited (the fests tag).
export const revalidate = 60;

const description =
    'College fests across India, each with its whole programme laid out day by day: what is on, where and when.';

export const metadata: Metadata = {
    title: 'Fests',
    description,
    ...shareMetadata({ title: 'Fests on Campus Connect', description, path: '/fests' }),
};

function FestTile({ fest, live }: { fest: FestCard; live?: boolean }) {
    const days = festLength(fest.startDate, fest.endDate);
    return (
        <li>
            <Link href={`/fests/${fest.id}`} className={styles.card}>
                <div className={styles.cover}>
                    {fest.coverImage ? (
                        <Image
                            src={fest.coverImage}
                            alt=""
                            fill
                            sizes="(max-width: 700px) calc(100vw - 32px), (max-width: 1100px) 50vw, 350px"
                            className={styles.coverImage}
                        />
                    ) : (
                        <span className={styles.coverStub} aria-hidden="true">
                            {fest.name.charAt(0).toUpperCase()}
                        </span>
                    )}
                    {live && <span className={styles.liveTag}>On now</span>}
                </div>
                <div className={styles.cardBody}>
                    <p className={styles.cardDates}>
                        {festDateRange(fest.startDate, fest.endDate)}
                        <span aria-hidden="true"> · </span>
                        {days} {days === 1 ? 'day' : 'days'}
                    </p>
                    <h3 className={styles.cardTitle}>{fest.name}</h3>
                    {fest.tagline && <p className={styles.cardTagline}>{fest.tagline}</p>}
                    <p className={styles.cardMeta}>
                        <span>{fest.college}</span>
                        {fest.club && (
                            <>
                                <span className={styles.rule} aria-hidden="true">/</span>
                                <span>{fest.club}</span>
                            </>
                        )}
                    </p>
                    <p className={styles.cardCount}>
                        {fest.eventCount === 0
                            ? 'Timetable coming soon'
                            : `${fest.eventCount} ${fest.eventCount === 1 ? 'event' : 'events'}`}
                        <ArrowRight size={14} aria-hidden="true" className={styles.cardArrow} />
                    </p>
                </div>
            </Link>
        </li>
    );
}

function Section({ id, title, fests, live }: { id: string; title: ReactNode; fests: FestCard[]; live?: boolean }) {
    return (
        <section className={styles.section} aria-labelledby={id}>
            <div className={styles.sectionHead}>
                <h2 id={id} className={styles.sectionTitle}>
                    {title}
                </h2>
                <span className={styles.sectionCount}>{fests.length}</span>
            </div>
            <ul className={styles.grid}>
                {fests.map((fest) => (
                    <FestTile key={fest.id} fest={fest} live={live} />
                ))}
            </ul>
        </section>
    );
}

export default async function FestsPage() {
    const fests = await getFestBoard();
    const now = new Date();

    const happening = fests.filter((f) => festPhase(f.startDate, f.endDate, now) === 'now');
    const upcoming = fests.filter((f) => festPhase(f.startDate, f.endDate, now) === 'upcoming');
    // Most recent first: the fest that ended yesterday is the one people look for.
    const ended = fests
        .filter((f) => festPhase(f.startDate, f.endDate, now) === 'ended')
        .reverse()
        .slice(0, 6);

    return (
        <div className={styles.page}>
            <header className={styles.masthead}>
                <p className={styles.kicker}>Fests</p>
                <h1 className={styles.title}>
                    Every fest, <em className="accent">day by day</em>
                </h1>
                <p className={styles.strap}>
                    Two or three days, thirty events, one place to see them all. Open a fest for its timetable,
                    then save the whole thing in one go.
                </p>
                <Link href="/fests/create" className={styles.startLink}>
                    Running a fest? Put it on the board
                    <ArrowRight size={14} aria-hidden="true" />
                </Link>
            </header>

            {fests.length === 0 ? (
                <div className={styles.empty}>
                    <p className={styles.emptyTitle}>No fests on the board yet</p>
                    <p className={styles.emptyText}>
                        When a college fest is approved, its full timetable shows up here.
                    </p>
                    <Link href="/events" className={styles.emptyLink}>
                        Browse single events meanwhile
                    </Link>
                </div>
            ) : (
                <>
                    {happening.length > 0 && (
                        <Section
                            id="fests-now"
                            title={<span className={styles.marker}>Happening now</span>}
                            fests={happening}
                            live
                        />
                    )}
                    {upcoming.length > 0 && <Section id="fests-upcoming" title="Coming up" fests={upcoming} />}
                    {happening.length === 0 && upcoming.length === 0 && (
                        <div className={styles.empty}>
                            <p className={styles.emptyTitle}>Nothing coming up right now</p>
                            <p className={styles.emptyText}>
                                The fests below have ended. New ones appear here as soon as they are approved.
                            </p>
                            <Link href="/events" className={styles.emptyLink}>
                                See upcoming events
                            </Link>
                        </div>
                    )}
                    {ended.length > 0 && (
                        <div className={styles.ended}>
                            <Section id="fests-ended" title="Recently ended" fests={ended} />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
