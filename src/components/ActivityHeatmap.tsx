'use client';

import { useMemo, useState, useEffect } from 'react';

interface ActivityHeatmapProps {
    dates: string[]; // Array of ISO date strings
}

export default function ActivityHeatmap({ dates }: ActivityHeatmapProps) {
    // Generate last 365 days
    const [days, setDays] = useState<Date[]>([]);

    useEffect(() => {
        const d = [];
        const today = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(today.getFullYear() - 1);

        for (let i = 0; i < 365; i++) {
            const date = new Date(oneYearAgo);
            date.setDate(date.getDate() + i);
            d.push(date);
        }
        setDays(d);
    }, []);

    // Count occurrences per date
    const activityMap = useMemo(() => {
        const map: Record<string, number> = {};
        dates.forEach(dateStr => {
            const key = new Date(dateStr).toDateString();
            map[key] = (map[key] || 0) + 1;
        });
        return map;
    }, [dates]);

    // Helper to get color intensity
    const getColor = (count: number) => {
        if (!count) return 'var(--surface-color)'; // Empty
        if (count === 1) return 'rgba(var(--primary-rgb), 0.4)'; // Low
        if (count === 2) return 'rgba(var(--primary-rgb), 0.7)'; // Medium
        return 'var(--primary-color)'; // High
    };

    return (
        <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 600 }}>Activity Graph</h3>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(53, 1fr)',
                gridTemplateRows: 'repeat(7, 1fr)',
                gap: '4px',
                gridAutoFlow: 'column',
                overflowX: 'auto',
                paddingBottom: '0.5rem'
            }}>
                {days.map((date: Date, i: number) => {
                    const count = activityMap[date.toDateString()] || 0;
                    return (
                        <div
                            key={i}
                            title={`${date.toDateString()}: ${count} activities`}
                            style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '2px',
                                backgroundColor: getColor(count),
                                border: count ? 'none' : '1px solid var(--border-color)',
                                transition: 'all 0.2s ease'
                            }}
                        />
                    );
                })}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                <span>Less</span>
                <div style={{ width: '10px', height: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '2px' }}></div>
                <div style={{ width: '10px', height: '10px', background: 'rgba(var(--primary-rgb), 0.4)', borderRadius: '2px' }}></div>
                <div style={{ width: '10px', height: '10px', background: 'rgba(var(--primary-rgb), 0.7)', borderRadius: '2px' }}></div>
                <div style={{ width: '10px', height: '10px', background: 'var(--primary-color)', borderRadius: '2px' }}></div>
                <span>More</span>
            </div>
        </div>
    );
}
