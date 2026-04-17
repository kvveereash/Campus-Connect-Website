'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import EventCard from '@/components/EventCard';
import EventCardSkeleton from '@/components/EventCardSkeleton';
import EventCalendar from '@/components/EventCalendar';
import EmptyState from '@/components/common/EmptyState';
import styles from './page.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import { EventWithRelations } from '@/lib/actions';
import Search from '@/components/Search';
import { Calendar, List, Sparkles, ChevronDown } from 'lucide-react';

const FILTERS = ['All', 'Hackathon', 'Fest', 'Workshop', 'Cultural', 'This Week'];

interface EventsClientProps {
    initialEvents: EventWithRelations[];
}

export default function EventsClient({ initialEvents }: EventsClientProps) {
    const events = initialEvents;
    const isLoading = false;

    // URL State Sync
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    const activeFilter = searchParams.get('category') || 'All';
    const [sortBy, setSortBy] = useState('Date');
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

    const updateFilter = (filter: string) => {
        const params = new URLSearchParams(searchParams);
        if (filter === 'All') {
            params.delete('category');
        } else {
            params.set('category', filter);
        }
        replace(`${pathname}?${params.toString()}`);
    };

    // Client-side sorting on server-filtered results
    // (Ideally sort on server too, but keeping client-sort for "Popularity" vs "Date" for now as it doesn't query extra data)
    // Actually, "Popularity" (registration count) is available on the data, so client sort works fine for the current page of results.
    const sortedEvents = [...events].sort((a, b) => {
        if (sortBy === 'Date') {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (sortBy === 'Popularity') {
            return b.registrationCount - a.registrationCount;
        }
        return 0;
    });

    // Sorting Logic
    // const sortedEvents = ... (already retrieved above)

    return (
        <div>
            <header className={styles.header}>
                <motion.h1
                    className={styles.title}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    Upcoming Events
                </motion.h1>
                <motion.p
                    className={styles.subtitle}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    Explore hackathons, fests, workshops, and cultural events across campuses.
                </motion.p>
            </header>

            {/* <div className={styles.searchBarContainer}><Search /></div> Hidden based on ref */}

            {/* Premium Filter Bar */}
            <div className={styles.filterContainer}>

                {/* 1. Filter Tabs (Gliding Pill) */}
                <div className={styles.filterGroup}>
                    {FILTERS.map((filter) => {
                        const isActive = activeFilter === filter;
                        return (
                            <button
                                key={filter}
                                onClick={() => updateFilter(filter)}
                                className={`${styles.filterTab} ${isActive ? styles.activeTab : ''}`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeFilterBubble"
                                        className={styles.activeBubble}
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <span className={styles.tabLabel}>{filter}</span>
                            </button>
                        );
                    })}
                </div>

                <div className={styles.controlsGroup}>
                    {/* 2. Sort Dropdown (Styled) */}
                    <div className={styles.sortWrapper}>
                        <span className={styles.sortLabel}>Sort by</span>
                        <div className={styles.selectContainer}>
                            <select
                                className={styles.sortSelect}
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="Date">Date</option>
                                <option value="Popularity">Popularity</option>
                            </select>
                            <ChevronDown className={styles.selectIcon} size={16} />
                        </div>
                    </div>

                    <div className={styles.divider} />

                    {/* 3. View Toggle (Segmented) */}
                    <div className={styles.viewToggle}>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`${styles.toggleBtn} ${viewMode === 'list' ? styles.activeToggle : ''}`}
                            aria-label="List View"
                        >
                            <List size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`${styles.toggleBtn} ${viewMode === 'calendar' ? styles.activeToggle : ''}`}
                            aria-label="Calendar View"
                        >
                            <Calendar size={18} />
                        </button>
                    </div>

                    {/* 4. Host Button (Gradient Pop) */}
                    <Link href="/events/create" className={styles.hostBtn}>
                        <span className={styles.btnText}>Host Event</span>
                        <div className={styles.btnIconBox}>
                            <Sparkles size={16} className={styles.btnIcon} />
                        </div>
                    </Link>
                </div>
            </div>

            {/* Calendar View */}
            {viewMode === 'calendar' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ marginTop: '1.5rem' }}
                >
                    <EventCalendar events={events.map(e => ({ id: e.id, title: e.title, date: new Date(e.date), category: e.category }))} />
                </motion.div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
                <motion.div
                    layout
                    className={styles.grid}
                >
                    <div className={styles.eventsGrid} id="events-grid" role="tabpanel">
                        <AnimatePresence mode="popLayout">
                            {isLoading ? (
                                Array(4).fill(0).map((_, i) => (
                                    <motion.div key={`skeleton-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <EventCardSkeleton />
                                    </motion.div>
                                ))
                            ) : sortedEvents.length > 0 ? (
                                sortedEvents.map((event, index) => (
                                    <motion.div
                                        layout
                                        key={event.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <EventCard event={event} index={index} />
                                    </motion.div>
                                ))
                            ) : (
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <EmptyState
                                        title="No Events Found"
                                        description="Try converting your search or filters to find more events."
                                        icon="🔍"
                                        actionLabel="Reset Filters"
                                        onAction={() => {
                                            replace(pathname); // Clear all params
                                        }}
                                    />
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}

            {viewMode === 'list' && sortedEvents.length > 0 && (
                <div className={styles.loadMoreContainer}>
                    <button className={styles.loadMoreBtn}>
                        Load More Events ▼
                    </button>
                </div>
            )}

            {viewMode === 'list' && sortedEvents.length === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}
                >
                    <p>No events found in {activeFilter} category.</p>
                    <button
                        className="btn btn-outline"
                        style={{ marginTop: '1rem' }}
                        onClick={() => {
                            replace(pathname);
                        }}
                    >
                        Clear Filters
                    </button>
                </motion.div>
            )}
        </div>
    );
}

