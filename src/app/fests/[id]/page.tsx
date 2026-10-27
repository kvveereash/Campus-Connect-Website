import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SITE_URL, shareMetadata } from '@/lib/site';
import { getFest, type FestDetail } from '../data';
import { festDateRange, festLength, festPhase } from '../rules';
import Timetable from '../Timetable';
import FestActions from './FestActions';
import styles from './page.module.css';

/*
 * Static: nothing here depends on who is looking. Each fest is rendered on
 * first visit, served from the CDN and rebuilt at most once a minute, or at
 * once when the fest or one of its events changes (the fest and events
 * tags). Saving the fest and the organisers' Edit link are asked for by the
 * browser (FestActions).
 *
 * A fest still waiting for approval is a plain 404 here, for everyone,
 * rather than a per-viewer page: checking the viewer would make every fest
 * page dynamic, a round trip to Mumbai from us-east-2 on each view, to serve
 * the handful of people who run it. They see it, pending events included,
 * on /fests/[id]/edit, which is dynamic and checks the session.
 */
export const revalidate = 60;
export function generateStaticParams() {
    return [];
}

const summary = (text: string) => (text.length > 155 ? `${text.slice(0, 152)}…` : text);

async function publicFest(id: string): Promise<FestDetail | null> {
    const fest = await getFest(id);
    return fest && fest.verified ? fest : null;
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await props.params;
    const fest = await publicFest(id);
    if (!fest) return { title: 'Fest not found' };
    const description = summary(
        fest.tagline
            ? `${fest.tagline}. ${festDateRange(fest.startDate, fest.endDate)} at ${fest.college}.`
            : `${festDateRange(fest.startDate, fest.endDate)} at ${fest.college}. ${fest.description}`
    );
    return {
        title: fest.name,
        description,
        ...shareMetadata({ title: fest.name, description, path: `/fests/${id}` }),
    };
}

/* schema.org Festival with its events, so search results can show the dates
   and programme. Escaped so a name containing "</script>" cannot end the tag. */
function festJsonLd(fest: FestDetail) {
    const json = {
        '@context': 'https://schema.org',
        '@type': 'Festival',
        name: fest.name,
        description: summary(fest.description),
        startDate: fest.startDate,
        endDate: fest.endDate,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        url: `${SITE_URL}/fests/${fest.id}`,
        ...(fest.coverImage ? { image: [new URL(fest.coverImage, SITE_URL).toString()] } : {}),
        location: {
            '@type': 'Place',
            name: fest.college,
            address: { '@type': 'PostalAddress', name: fest.collegeLocation, addressCountry: 'IN' },
        },
        subEvent: fest.events.slice(0, 50).map((e) => ({
            '@type': 'Event',
            name: e.title,
            startDate: e.date,
            url: `${SITE_URL}/events/${e.id}`,
            location: { '@type': 'Place', name: e.venue },
        })),
    };
    return JSON.stringify(json).replace(/</g, '\\u003c');
}

export default async function FestPage(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params;
    const fest = await publicFest(id);
    if (!fest) notFound();

    const now = new Date();
    const phase = festPhase(fest.startDate, fest.endDate, now);
    const days = festLength(fest.startDate, fest.endDate);
    const upcoming = fest.events.filter((e) => new Date(e.date).getTime() >= now.getTime()).length;

    return (
        <div className={styles.page}>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: festJsonLd(fest) }} />

            <Link href="/fests" className={styles.back}>
                <ArrowLeft size={13} aria-hidden="true" />
                All fests
            </Link>

            <header className={styles.masthead}>
                <div className={styles.eyebrow}>
                    {phase === 'now' && <span className={styles.live}>On now</span>}
                    <span className={styles.eyebrowInk}>{festDateRange(fest.startDate, fest.endDate)}</span>
                    <span className={styles.eyebrowRule} aria-hidden="true">/</span>
                    <span>
                        {days} {days === 1 ? 'day' : 'days'}
                    </span>
                    <span className={styles.eyebrowRule} aria-hidden="true">/</span>
                    <span>
                        {fest.eventCount} {fest.eventCount === 1 ? 'event' : 'events'}
                    </span>
                    {phase === 'ended' && <span className={styles.ended}>Ended</span>}
                </div>

                <h1 className={styles.title}>{fest.name}</h1>
                {fest.tagline && <p className={styles.tagline}>{fest.tagline}</p>}

                <p className={styles.host}>
                    <Link href={`/colleges/${fest.collegeId}`} className={styles.hostLink}>
                        {fest.college}
                    </Link>
                    {fest.club && fest.clubId && (
                        <>
                            <span className={styles.eyebrowRule} aria-hidden="true">
                                {' '}
                                ·{' '}
                            </span>
                            Run by{' '}
                            <Link href={`/clubs/${fest.clubId}`} className={styles.hostLink}>
                                {fest.club}
                            </Link>
                        </>
                    )}
                </p>
            </header>

            {fest.coverImage && (
                <div className={styles.cover}>
                    <Image
                        src={fest.coverImage}
                        alt=""
                        fill
                        priority
                        sizes="(max-width: 1110px) calc(100vw - 32px), 1078px"
                        className={styles.coverImage}
                    />
                </div>
            )}

            <div className={styles.controls}>
                <FestActions festId={fest.id} upcomingCount={upcoming} />
            </div>

            <section className={styles.section} aria-labelledby="about-title">
                <h2 id="about-title" className={styles.sectionLabel}>
                    About
                </h2>
                <p className={styles.description}>{fest.description}</p>
            </section>

            <section className={styles.section} aria-labelledby="timetable-title">
                <h2 id="timetable-title" className={styles.sectionTitle}>
                    What is on, <em className="accent">day by day</em>
                </h2>
                <p className={styles.sectionNote}>Times are India time. Open an event to register.</p>
                <Timetable
                    events={fest.events}
                    festStart={fest.startDate}
                    festEnd={fest.endDate}
                    now={now.getTime()}
                    empty={{
                        title: 'The timetable is still being written',
                        text: 'The organisers add events here as each one is confirmed. Check back closer to the fest.',
                        action: (
                            <Link href="/events" className={styles.emptyLink}>
                                Browse other events
                            </Link>
                        ),
                    }}
                />
            </section>
        </div>
    );
}
