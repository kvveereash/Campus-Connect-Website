'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

interface CalendarEvent {
    id: string;
    title: string;
    date: Date;
    category: string;
}

interface EventCalendarProps {
    events: CalendarEvent[];
}

// Category colors
const categoryColors: Record<string, string> = {
    'Hackathon': '#ef4444',
    'Fest': '#f97316',
    'Workshop': '#22c55e',
    'Cultural': '#a855f7',
    'Tech Talk': '#3b82f6',
    'Seminar': '#6366f1',
    'default': '#64748b'
};

export default function EventCalendar({ events }: EventCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Get calendar days
    const calendarDays = useMemo(() => {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days: (number | null)[] = [];

        // Add empty slots for days before the first day
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add actual days
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day);
        }

        return days;
    }, [year, month]);

    // Group events by day
    const eventsByDay = useMemo(() => {
        const grouped: Record<number, CalendarEvent[]> = {};

        events.forEach(event => {
            const eventDate = new Date(event.date);
            if (eventDate.getFullYear() === year && eventDate.getMonth() === month) {
                const day = eventDate.getDate();
                if (!grouped[day]) grouped[day] = [];
                grouped[day].push(event);
            }
        });

        return grouped;
    }, [events, year, month]);

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const today = new Date();
    const isToday = (day: number) =>
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === day;

    return (
        <div style={{
            background: 'var(--surface-color)',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem'
            }}>
                <button
                    onClick={goToPreviousMonth}
                    style={{
                        background: 'var(--background-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '0.5rem',
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        fontSize: '1rem'
                    }}
                >
                    ←
                </button>

                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                        {monthNames[month]} {year}
                    </h2>
                    <button
                        onClick={goToToday}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary-color)',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                        }}
                    >
                        Today
                    </button>
                </div>

                <button
                    onClick={goToNextMonth}
                    style={{
                        background: 'var(--background-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '0.5rem',
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        fontSize: '1rem'
                    }}
                >
                    →
                </button>
            </div>

            {/* Days of week header */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '0.25rem',
                marginBottom: '0.5rem'
            }}>
                {daysOfWeek.map(day => (
                    <div
                        key={day}
                        style={{
                            textAlign: 'center',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)',
                            padding: '0.5rem'
                        }}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '0.25rem'
            }}>
                {calendarDays.map((day, index) => (
                    <div
                        key={index}
                        style={{
                            minHeight: '80px',
                            background: day ? 'var(--background-color)' : 'transparent',
                            borderRadius: '0.5rem',
                            padding: '0.5rem',
                            border: day && isToday(day) ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                            position: 'relative'
                        }}
                    >
                        {day && (
                            <>
                                <span style={{
                                    fontSize: '0.875rem',
                                    fontWeight: isToday(day) ? 700 : 400,
                                    color: isToday(day) ? 'var(--primary-color)' : 'var(--text-primary)'
                                }}>
                                    {day}
                                </span>

                                {/* Events for this day */}
                                <div style={{ marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                                    {eventsByDay[day]?.slice(0, 3).map(event => (
                                        <Link
                                            key={event.id}
                                            href={`/events/${event.id}`}
                                            style={{
                                                display: 'block',
                                                fontSize: '0.7rem',
                                                padding: '0.125rem 0.25rem',
                                                borderRadius: '0.25rem',
                                                background: categoryColors[event.category] || categoryColors.default,
                                                color: 'white',
                                                textDecoration: 'none',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}
                                            title={event.title}
                                        >
                                            {event.title}
                                        </Link>
                                    ))}
                                    {eventsByDay[day]?.length > 3 && (
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                            +{eventsByDay[day].length - 3} more
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div style={{
                marginTop: '1rem',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.75rem',
                justifyContent: 'center'
            }}>
                {Object.entries(categoryColors).filter(([key]) => key !== 'default').map(([category, color]) => (
                    <div key={category} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <div style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '0.25rem',
                            background: color
                        }} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{category}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
