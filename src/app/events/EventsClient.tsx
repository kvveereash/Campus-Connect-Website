'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { EventWithRelations } from '@/lib/actions';
import { inkFor, dateParts, groupByProximity } from './press';
import styles from './press.module.css';

type TimeFilter = 'Any' | 'This week' | 'This month';
const TIME_FILTERS: TimeFilter[] = ['Any', 'This week', 'This month'];

interface EventsClientProps {
    initialEvents: EventWithRelations[];
}

export default function EventsClient({ initialEvents }: EventsClientProps) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();
    const railRef = useRef<HTMLElement>(null);

    const activeCategory = searchParams.get('category') || 'All';
    const [activeTime, setActiveTime] = useState<TimeFilter>('Any');

    /**
     * Category tabs are derived from the events themselves rather than a
     * hardcoded list. The previous list offered "Fest" and "This Week", neither
     * of which is a category any event carries, so both returned nothing, while
     * Technology — the largest category — had no tab at all.
     */
    const categories = useMemo(() => {
        const counts = new Map<string, number>();
        for (const e of initialEvents) {
            counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
        }
        return [...counts.entries()].sort((a, b) => b[1] - a[1]);
    }, [initialEvents]);

    const { endOfWeek, endOfMonth } = useMemo(() => {
        const now = new Date();
        const week = new Date(now);
        week.setDate(now.getDate() + (7 - now.getDay()));
        week.setHours(23, 59, 59, 999);
        return {
            endOfWeek: week,
            endOfMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
        };
    }, []);

    const visible = useMemo(() => {
        return initialEvents
            .filter((e) => activeCategory === 'All' || e.category === activeCategory)
            .filter((e) => {
                if (activeTime === 'Any') return true;
                const d = new Date(e.date);
                return activeTime === 'This week' ? d <= endOfWeek : d <= endOfMonth;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [initialEvents, activeCategory, activeTime, endOfWeek, endOfMonth]);

    /**
     * The featured slot is an editorial choice for the default view only. Once
     * the user filters they have asked for a list, and promoting one result out
     * of it made a single match render as "nothing matches your filters".
     */
    const isDefaultView = activeCategory === 'All' && activeTime === 'Any';
    const featured = isDefaultView ? visible[0] : undefined;
    const listed = isDefaultView ? visible.slice(1) : visible;
    const groups = useMemo(() => groupByProximity(listed), [listed]);

    const setCategory = (category: string) => {
        const params = new URLSearchParams(searchParams);
        if (category === 'All') params.delete('category');
        else params.set('category', category);
        replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    // Sticky group headings must clear the sticky rail above them.
    useEffect(() => {
        const sync = () => {
            const h = railRef.current?.offsetHeight ?? 112;
            document.documentElement.style.setProperty('--rail-h', `${h}px`);
        };
        sync();
        window.addEventListener('resize', sync);
        return () => window.removeEventListener('resize', sync);
    }, [categories.length]);

    return (
        <div className={styles.screen}>
            <div className={styles.inner}>
                <header className={styles.masthead}>
                    <div className={styles.mastheadRow}>
                        <h1 className={styles.wordmark}>Events</h1>
                        <span className={styles.count}>{visible.length} upcoming</span>
                    </div>
                    <p className={styles.strap}>
                        Hackathons, fests, workshops and cultural nights across campus. Everything
                        that&rsquo;s coming, in the order it arrives.
                    </p>
                </header>

                {featured && <Featured event={featured} />}

                <nav className={styles.rail} ref={railRef} aria-label="Filter events">
                    <div className={styles.railRow}>
                        <span className={styles.railLabel}>Category</span>
                        <button
                            type="button"
                            className={styles.chip}
                            aria-pressed={activeCategory === 'All'}
                            onClick={() => setCategory('All')}
                        >
                            All
                            <span className={styles.chipCount}>{initialEvents.length}</span>
                        </button>
                        {categories.map(([name, n]) => (
                            <button
                                key={name}
                                type="button"
                                className={styles.chip}
                                data-cat={name}
                                aria-pressed={activeCategory === name}
                                onClick={() => setCategory(name)}
                                style={{ ['--cat' as string]: inkFor(name) }}
                            >
                                <i className={styles.swatch} aria-hidden="true" />
                                {name}
                                <span className={styles.chipCount}>{n}</span>
                            </button>
                        ))}
                    </div>

                    {/* Time is a separate axis from category. Conflating them is
                        what made the old "This Week" tab return nothing. */}
                    <div className={styles.railRow}>
                        <span className={styles.railLabel}>When</span>
                        {TIME_FILTERS.map((t) => (
                            <button
                                key={t}
                                type="button"
                                className={styles.chip}
                                aria-pressed={activeTime === t}
                                onClick={() => setActiveTime(t)}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </nav>

                <main>
                    {groups.length === 0 ? (
                        <p className={styles.empty}>Nothing matches those filters.</p>
                    ) : (
                        groups.map((group) => (
                            <section key={group.label}>
                                <div className={styles.groupHead}>
                                    <h2>{group.label}</h2>
                                    <span className={styles.groupCount}>{group.items.length}</span>
                                </div>
                                {group.items.map((event) => (
                                    <EventRow key={event.id} event={event} />
                                ))}
                            </section>
                        ))
                    )}
                </main>

                <div className={styles.footRule}>
                    <span>Campus Press</span>
                    <span>{initialEvents.length} live events</span>
                </div>
            </div>
        </div>
    );
}

function hostOf(event: EventWithRelations) {
    return event.club?.name || event.hostCollege?.name || 'Campus';
}

function initialsOf(title: string) {
    return title
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0] ?? '')
        .join('')
        .toUpperCase();
}

function Featured({ event }: { event: EventWithRelations }) {
    const ink = inkFor(event.category);
    const { month, day, weekday } = dateParts(event.date);

    return (
        <Link
            href={`/events/${event.id}`}
            className={styles.featured}
            style={{ ['--cat' as string]: ink }}
        >
            {event.thumbnail ? (
                <Image
                    src={event.thumbnail}
                    alt=""
                    fill
                    priority
                    sizes="(max-width: 1140px) 100vw, 1140px"
                    className={styles.featuredImage}
                />
            ) : (
                <div className={styles.typePoster} role="img" aria-label={event.title}>
                    {/* Eight repeats, drifting up by a quarter of the stack —
                        which is exactly two of them. Every span is identical,
                        so landing on a whole number of lines means the loop
                        restarts on a frame that looks the same as the one
                        before it, and the drift never appears to jump. */}
                    <div className={styles.typePosterTrack}>
                        {Array.from({ length: 8 }, (_, i) => (
                            <span key={i} aria-hidden="true">
                                {event.category}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className={styles.featuredBody}>
                <span className={styles.featuredKicker}>
                    <i aria-hidden="true" />
                    {event.category} &middot; Next up
                </span>
                <h2 className={styles.featuredTitle}>{event.title}</h2>
                <div className={styles.featuredMeta}>
                    <span>
                        {month} {day}, {weekday}
                    </span>
                    <span className={styles.sep}>/</span>
                    <span>{event.venue}</span>
                    <span className={styles.sep}>/</span>
                    <span>{hostOf(event)}</span>
                </div>
            </div>
        </Link>
    );
}

function EventRow({ event }: { event: EventWithRelations }) {
    const ink = inkFor(event.category);
    const { month, day, weekday } = dateParts(event.date);
    const going = event.registrationCount ?? 0;

    return (
        <Link
            href={`/events/${event.id}`}
            className={styles.row}
            style={{ ['--cat' as string]: ink }}
        >
            <div className={styles.date}>
                <div className={styles.dateMonth}>{month}</div>
                <div className={styles.dateDay}>{day}</div>
                <div className={styles.dateWeekday}>{weekday}</div>
            </div>

            <div>
                <h3 className={styles.rowTitle}>{event.title}</h3>
                <div className={styles.rowMeta}>
                    <span>{event.venue}</span>
                    <span className={styles.sep}>/</span>
                    <span>{hostOf(event)}</span>
                </div>
                <div className={styles.rowTags}>
                    <span className={styles.cat}>
                        <i aria-hidden="true" />
                        {event.category}
                    </span>
                    <span className={`${styles.price} ${event.price > 0 ? '' : styles.priceFree}`}>
                        {event.price > 0 ? `$${event.price}` : 'Free'}
                    </span>
                    {/* Zero is not shown — the old card advertised "0 Reg." */}
                    {going > 0 && <span className={styles.going}>{going} going</span>}
                </div>
            </div>

            <div className={styles.cover}>
                {event.thumbnail ? (
                    <Image
                        src={event.thumbnail}
                        alt=""
                        fill
                        sizes="132px"
                        style={{ objectFit: 'cover' }}
                    />
                ) : (
                    <div className={styles.coverStub} aria-hidden="true">
                        <span>{initialsOf(event.title)}</span>
                    </div>
                )}
            </div>
        </Link>
    );
}
