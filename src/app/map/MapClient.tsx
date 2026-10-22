'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import Reveal from '@/components/Reveal';
import { formatIST } from '@/lib/format';
import VenueMap from './VenueMap';

interface MapEvent {
    id: string;
    title: string;
    venue: string;
    date: string;
    category: string;
    hostCollege: { name: string; location: string } | null;
}

export default function MapClient({ events }: { events: MapEvent[] }) {
    const [activeCategory, setActiveCategory] = useState('All');

    /* Categories are read off the events on screen. The old list was written
       by hand and included "Tech", which matches nothing — the category in the
       database is "Technology" — so that filter always emptied the page while
       four real categories had no filter at all. */
    const categories = useMemo(() => {
        const counts = new Map<string, number>();
        for (const e of events) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
        return [...counts.entries()]
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    }, [events]);

    const visible = useMemo(
        () => (activeCategory === 'All' ? events : events.filter((e) => e.category === activeCategory)),
        [events, activeCategory],
    );

    /* One pin per college with something coming up, sized by how much. */
    const mapColleges = useMemo(() => {
        const counts = new Map<string, number>();
        for (const e of visible) {
            const name = e.hostCollege?.name;
            if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
        }
        return [...counts].map(([name, n]) => ({ name, events: n }));
    }, [visible]);

    /* Grouped by venue, venues ordered by whichever has something happening
       soonest — the order someone reading this actually cares about. */
    const venues = useMemo(() => {
        const map = new Map<string, MapEvent[]>();
        for (const e of visible) {
            const list = map.get(e.venue);
            if (list) list.push(e);
            else map.set(e.venue, [e]);
        }
        return [...map.entries()]
            .map(([venue, list]) => ({
                venue,
                events: list,
                college: list[0].hostCollege,
                next: new Date(list[0].date).getTime(),
            }))
            .sort((a, b) => a.next - b.next);
    }, [visible]);

    return (
        <div className={styles.page}>
            <header className={styles.masthead}>
                <div>
                    <p className={styles.label}>Venues</p>
                    <h1 className={styles.title}>Where it happens.</h1>
                </div>
                <p className={styles.note}>
                    {venues.length} {venues.length === 1 ? 'venue' : 'venues'} with something
                    coming up
                </p>
            </header>

            <div className={styles.filters}>
                <button
                    type="button"
                    className={styles.filter}
                    aria-pressed={activeCategory === 'All'}
                    onClick={() => setActiveCategory('All')}
                >
                    All
                    <span className={styles.filterCount}>{events.length}</span>
                </button>
                {categories.map((c) => (
                    <button
                        key={c.name}
                        type="button"
                        className={styles.filter}
                        aria-pressed={activeCategory === c.name}
                        onClick={() => setActiveCategory(c.name)}
                    >
                        {c.name}
                        <span className={styles.filterCount}>{c.count}</span>
                    </button>
                ))}
            </div>

            {mapColleges.length > 0 && <VenueMap colleges={mapColleges} />}

            {venues.length === 0 ? (
                <div className={styles.empty}>
                    <h2 className={styles.emptyTitle}>Nothing scheduled.</h2>
                    <p className={styles.emptyText}>
                        No upcoming events in {activeCategory.toLowerCase()} yet.
                    </p>
                </div>
            ) : (
                <div className={styles.venues}>
                    {venues.map((v, i) => (
                        <Reveal key={v.venue} delay={Math.min(i, 6) * 0.05}>
                        <section className={styles.venue}>
                            <div className={styles.venueHead}>
                                <h2 className={styles.venueName}>{v.venue}</h2>
                                <span className={styles.venueMeta}>
                                    {v.college?.name}
                                    {v.college?.location ? ` · ${v.college.location}` : ''}
                                </span>
                            </div>

                            <div className={styles.venueEvents}>
                                {v.events.map((e) => {
                                    const when = new Date(e.date);
                                    return (
                                        <Link
                                            key={e.id}
                                            href={`/events/${e.id}`}
                                            className={styles.row}
                                        >
                                            <span className={styles.rowDate}>
                                                {formatIST(when, {
                                                    day: '2-digit',
                                                    month: 'short',
                                                })}
                                            </span>
                                            <span className={styles.rowTitle}>{e.title}</span>
                                            <span className={styles.rowTag}>{e.category}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </section>
                        </Reveal>
                    ))}
                </div>
            )}
        </div>
    );
}
