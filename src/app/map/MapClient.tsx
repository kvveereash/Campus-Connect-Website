'use client';

import { useState } from 'react';
import styles from './page.module.css';

// Coordinate mapping (Percentage from Top/Left)
const VENUE_COORDINATES: Record<string, { top: number; left: number }> = {
    'Auditorium': { top: 25, left: 50 },
    'Main Auditorium': { top: 25, left: 50 },
    'Central Hall': { top: 25, left: 50 },
    'Lab': { top: 70, left: 15 },
    'Computer Center': { top: 70, left: 15 },
    'CS Department': { top: 70, left: 15 },
    'Ground': { top: 70, left: 80 },
    'Sports Complex': { top: 70, left: 80 },
    'Cafeteria': { top: 20, left: 80 },
    'Canteen': { top: 20, left: 80 },
    'Library': { top: 25, left: 15 },
};

// Fallback for unknown venues
const DEFAULT_COORDINATE = { top: 50, left: 50 };

export default function MapClient({ events }: { events: any[] }) {
    const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState('All');

    const categories = ['All', 'Tech', 'Cultural', 'Sports', 'Workshop'];

    const filteredEvents = activeCategory === 'All'
        ? events
        : events.filter(e => e.category === activeCategory);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Campus Map 🗺️</h1>
                <p style={{ color: '#94a3b8' }}>Real-time event tracking system</p>
            </header>

            {/* Filter Pills */}
            <div className={styles.filterContainer}>
                {categories.map(cat => (
                    <button
                        key={cat}
                        className={`${styles.filterBtn} ${activeCategory === cat ? styles.active : ''}`}
                        onClick={() => setActiveCategory(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className={styles.mapWrapper}>
                <div className={styles.mapBoard}>
                    {/* SVG Cyber Paths */}
                    <div className={styles.pathOverlay}>
                        <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                            {/* Paths from Entrance (50% 90%) to Zones */}
                            <path d="M 50% 90% L 50% 35%" className={styles.cyberPath} /> {/* To Auditorium */}
                            <path d="M 50% 90% L 20% 70%" className={styles.cyberPath} /> {/* To CS */}
                            <path d="M 50% 90% L 80% 70%" className={styles.cyberPath} /> {/* To Sports */}
                        </svg>
                    </div>

                    {/* Zones (Visual Reference) */}
                    <div className={`${styles.zone} ${styles.auditorium}`}>Main Auditorium</div>
                    <div className={`${styles.zone} ${styles.labs}`}>CS & Labs</div>
                    <div className={`${styles.zone} ${styles.sports}`}>Sports Complex</div>
                    <div className={`${styles.zone} ${styles.cafeteria}`}>Cafeteria</div>
                    <div className={`${styles.zone} ${styles.library}`}>Library</div>

                    {/* You Are Here Marker */}
                    <div className={styles.userMarker}>
                        <div className={styles.userDot}></div>
                        <div className={styles.userLabel}>You Are Here</div>
                    </div>

                    {/* Event Pins */}
                    {filteredEvents.map((event) => {
                        // Find coordinate based on venue string match
                        const venueKey = Object.keys(VENUE_COORDINATES).find(key =>
                            event.venue.toLowerCase().includes(key.toLowerCase())
                        );

                        const coords = venueKey ? VENUE_COORDINATES[venueKey] : DEFAULT_COORDINATE;

                        return (
                            <div
                                key={event.id}
                                className={styles.pinContainer}
                                style={{ top: `${coords.top}%`, left: `${coords.left}%` }}
                                onMouseEnter={() => setSelectedEvent(event.id)}
                                onMouseLeave={() => setSelectedEvent(null)}
                            >
                                <div className={styles.pin}>
                                    <span className={styles.pinIcon}>📍</span>
                                </div>
                                <div className={styles.pulse}></div>

                                <div className={styles.tooltip}>
                                    <div className={styles.tooltipTitle}>{event.title}</div>
                                    <span className={styles.tooltipDate}>
                                        {new Date(event.date).toLocaleDateString(undefined, {
                                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </span>
                                    <div className={styles.tooltipCategory}>{event.category}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
