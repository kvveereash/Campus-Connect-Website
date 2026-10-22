'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronDown, Search } from 'lucide-react';
import { EventWithRelations } from '@/lib/actions';
import { useAuth } from '@/context/AuthContext';
import { inkFor, dateParts, groupByProximity, cityOf, matchesSearch } from './press';
import { eventPhoto } from '@/lib/college-images';
import RevealGroup from '@/components/RevealGroup';
import ForYou from './ForYou';
import EventRow, { hostOf } from './EventRow';
import styles from './press.module.css';

type TimeFilter = 'Any' | 'This week' | 'This month';
const TIME_FILTERS: TimeFilter[] = ['Any', 'This week', 'This month'];

/** ?where= value for the signed-in student's own college. */
const MY_COLLEGE = 'my-college';

interface EventsClientProps {
    initialEvents: EventWithRelations[];
}

/** What the board needs from the URL: just the category, read-only. */
type Params = { get(name: string): string | null; toString(): string } | null;

/**
 * The page is served from the CDN, so it is built without a URL. The board
 * is rendered once with no category for that cached HTML (the Suspense
 * fallback, so the list is in the page source and on screen at first paint),
 * then again with the URL's ?category= once the browser has it.
 */
export default function EventsClient(props: EventsClientProps) {
    return (
        <Suspense fallback={<EventsBoard {...props} searchParams={null} />}>
            <EventsWithParams {...props} />
        </Suspense>
    );
}

function EventsWithParams(props: EventsClientProps) {
    const searchParams = useSearchParams();
    return <EventsBoard {...props} searchParams={searchParams} />;
}

function EventsBoard({ initialEvents, searchParams }: EventsClientProps & { searchParams: Params }) {
    const pathname = usePathname();
    const { replace } = useRouter();
    const railRef = useRef<HTMLElement>(null);

    const { user } = useAuth();
    const activeCategory = searchParams?.get('category') || 'All';
    const [activeTime, setActiveTime] = useState<TimeFilter>('Any');

    /* Search and place live in the URL like the category, so a filtered board
       can be shared ("hackathons in Pune"). The box keeps its own state and
       writes the URL a moment after typing stops, so typing never waits on a
       navigation. */
    const urlQuery = searchParams?.get('q') ?? '';
    const [query, setQuery] = useState(urlQuery);
    const where = searchParams?.get('where') ?? '';
    const myCollegeId = user?.collegeId || '';

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

    /** Cities with upcoming events, busiest first, for the place picker. */
    const cities = useMemo(() => {
        const counts = new Map<string, number>();
        for (const e of initialEvents) {
            const city = cityOf(e.hostCollege?.location);
            if (city) counts.set(city, (counts.get(city) ?? 0) + 1);
        }
        return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    }, [initialEvents]);

    const myCollegeCount = useMemo(
        () => (myCollegeId ? initialEvents.filter((e) => e.hostCollegeId === myCollegeId).length : 0),
        [initialEvents, myCollegeId],
    );

    const visible = useMemo(() => {
        return initialEvents
            .filter((e) => activeCategory === 'All' || e.category === activeCategory)
            .filter((e) => {
                if (!where) return true;
                if (where === MY_COLLEGE) return e.hostCollegeId === myCollegeId;
                return cityOf(e.hostCollege?.location) === where;
            })
            .filter((e) => matchesSearch(e, urlQuery))
            .filter((e) => {
                if (activeTime === 'Any') return true;
                const d = new Date(e.date);
                return activeTime === 'This week' ? d <= endOfWeek : d <= endOfMonth;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [initialEvents, activeCategory, where, myCollegeId, urlQuery, activeTime, endOfWeek, endOfMonth]);

    /**
     * The featured slot is an editorial choice for the default view only. Once
     * the user filters they have asked for a list, and promoting one result out
     * of it made a single match render as "nothing matches your filters".
     */
    const isDefaultView = activeCategory === 'All' && activeTime === 'Any' && !where && !urlQuery;
    const featured = isDefaultView ? visible[0] : undefined;
    const listed = isDefaultView ? visible.slice(1) : visible;
    const groups = useMemo(() => groupByProximity(listed), [listed]);

    const setParam = useCallback(
        (name: string, value: string) => {
            const params = new URLSearchParams(searchParams?.toString() ?? '');
            if (value) params.set(name, value);
            else params.delete(name);
            const qs = params.toString();
            replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        },
        [searchParams, pathname, replace],
    );

    const setCategory = (category: string) => setParam('category', category === 'All' ? '' : category);

    // Write the search to the URL once typing pauses.
    useEffect(() => {
        const next = query.trim();
        if (next === urlQuery) return;
        const t = setTimeout(() => setParam('q', next), 250);
        return () => clearTimeout(t);
    }, [query, urlQuery, setParam]);

    const clearFilters = () => {
        setQuery('');
        setActiveTime('Any');
        replace(pathname, { scroll: false });
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
                    <p className="mono-label">The board</p>
                    <div className={styles.mastheadRow}>
                        <h1 className={styles.wordmark}>
                            What&rsquo;s <em className="accent">on</em>
                        </h1>
                        <span className={styles.count}>{visible.length} upcoming</span>
                    </div>
                    <p className={styles.strap}>
                        Hackathons, fests, workshops and cultural nights across campus. Everything
                        that&rsquo;s coming, in the order it arrives.
                    </p>

                    <div className={styles.finder} role="search">
                        <label className={styles.searchField}>
                            <Search size={16} className={styles.finderIcon} aria-hidden="true" />
                            <input
                                type="search"
                                aria-label="Search events"
                                className={styles.searchInput}
                                placeholder="Search events, clubs, colleges"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                enterKeyHint="search"
                                autoComplete="off"
                            />
                        </label>

                        <label className={styles.placeField}>
                            <select
                                aria-label="Where"
                                className={styles.placeSelect}
                                value={where}
                                onChange={(e) => setParam('where', e.target.value)}
                            >
                                <option value="">Anywhere</option>
                                {myCollegeId && (
                                    <option value={MY_COLLEGE}>My college ({myCollegeCount})</option>
                                )}
                                {cities.map(([city, n]) => (
                                    <option key={city} value={city}>
                                        {city} ({n})
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={16} className={styles.placeChevron} aria-hidden="true" />
                        </label>
                    </div>
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
                    {/* Only on the unfiltered board: under a filter it would
                        sit above results it might not belong to. */}
                    {isDefaultView && <ForYou events={initialEvents} />}
                    {groups.length === 0 ? (
                        <div className={styles.empty}>
                            <p className={styles.emptyTitle}>Nothing matches</p>
                            <p>
                                {urlQuery
                                    ? `No upcoming event matches “${urlQuery}” with these filters.`
                                    : 'No upcoming event matches these filters.'}
                            </p>
                            <button type="button" className="btn btn-outline" onClick={clearFilters}>
                                Clear filters
                            </button>
                        </div>
                    ) : (
                        groups.map((group) => (
                            <RevealGroup as="section" key={group.label}>
                                <div className={styles.groupHead}>
                                    <h2>{group.label}</h2>
                                    <span className={styles.groupCount}>{group.items.length}</span>
                                </div>
                                {group.items.map((event) => (
                                    <EventRow key={event.id} event={event} />
                                ))}
                            </RevealGroup>
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

function Featured({ event }: { event: EventWithRelations }) {
    const ink = inkFor(event.category);
    const photo = eventPhoto(event);
    const { month, day, weekday } = dateParts(event.date);

    return (
        <Link
            href={`/events/${event.id}`}
            className={styles.featured}
            style={{ ['--cat' as string]: ink }}
        >
            {photo ? (
                <Image
                    src={photo}
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
