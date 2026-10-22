'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { EventWithRelations } from '@/lib/actions';
import EventRow from './EventRow';
import { inkFor } from './press';
import styles from './EventsCalendar.module.css';

/* "YYYY-MM-DD" of a moment in Indian time: the day an event is "on". */
const IST_KEY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
const MONTH = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const DAY_LONG = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const keyOf = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/**
 * The board as a month. Shows whatever the filters above have left, so
 * "hackathons in Pune" can be seen as dates. Tap a day for its events.
 */
export default function EventsCalendar({ events }: { events: EventWithRelations[] }) {
    const todayKey = IST_KEY.format(new Date());
    const [ty, tm] = todayKey.split('-').map(Number);
    const [month, setMonth] = useState({ y: ty, m: tm - 1 });
    const [selected, setSelected] = useState<string | null>(null);

    const byDay = useMemo(() => {
        const map = new Map<string, EventWithRelations[]>();
        for (const e of events) {
            const k = IST_KEY.format(new Date(e.date));
            map.set(k, [...(map.get(k) ?? []), e]);
        }
        return map;
    }, [events]);

    const cells = useMemo(() => {
        const first = new Date(Date.UTC(month.y, month.m, 1));
        const lead = (first.getUTCDay() + 6) % 7; // Monday first
        const days = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate();
        return [
            ...Array.from({ length: lead }, () => null),
            ...Array.from({ length: days }, (_, i) => i + 1),
        ];
    }, [month]);

    const shift = (by: number) => {
        setSelected(null);
        setMonth(({ y, m }) => {
            const d = new Date(Date.UTC(y, m + by, 1));
            return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
        });
    };

    const isCurrentMonth = month.y === ty && month.m === tm - 1;
    const chosen = selected ? byDay.get(selected) ?? [] : [];
    const [sy, sm, sd] = selected ? selected.split('-').map(Number) : [0, 0, 0];

    return (
        <section className={styles.wrap} aria-label="Events by date">
            <div className={styles.head}>
                <h2 className={styles.month}>{MONTH.format(new Date(Date.UTC(month.y, month.m, 1)))}</h2>
                <div className={styles.nav}>
                    <button
                        type="button"
                        className={styles.navBtn}
                        onClick={() => shift(-1)}
                        disabled={isCurrentMonth}
                        aria-label="Previous month"
                    >
                        <ChevronLeft size={18} aria-hidden="true" />
                    </button>
                    <button type="button" className={styles.navBtn} onClick={() => shift(1)} aria-label="Next month">
                        <ChevronRight size={18} aria-hidden="true" />
                    </button>
                </div>
            </div>

            <div className={styles.grid}>
                {WEEKDAYS.map((w) => (
                    <div key={w} className={styles.weekday} aria-hidden="true">
                        {w}
                    </div>
                ))}
                {cells.map((day, i) => {
                    if (day === null) return <div key={`pad-${i}`} className={styles.pad} aria-hidden="true" />;
                    const k = keyOf(month.y, month.m, day);
                    const list = byDay.get(k) ?? [];
                    const past = k < todayKey;
                    return (
                        <button
                            key={k}
                            type="button"
                            className={styles.day}
                            data-today={k === todayKey ? 'true' : undefined}
                            data-past={past ? 'true' : undefined}
                            aria-pressed={selected === k}
                            disabled={list.length === 0}
                            onClick={() => setSelected(selected === k ? null : k)}
                            aria-label={`${day}: ${list.length === 0 ? 'nothing on' : `${list.length} event${list.length === 1 ? '' : 's'}`}`}
                        >
                            <span className={styles.num}>{day}</span>
                            {list.length > 0 && (
                                <span className={styles.dots} aria-hidden="true">
                                    {list.slice(0, 3).map((e) => (
                                        <i key={e.id} style={{ background: inkFor(e.category) }} />
                                    ))}
                                    {list.length > 3 && <b>+{list.length - 3}</b>}
                                </span>
                            )}
                            {list.length > 0 && <span className={styles.first}>{list[0].title}</span>}
                        </button>
                    );
                })}
            </div>

            {selected ? (
                <div className={styles.dayList}>
                    <h3 className={styles.dayTitle}>{DAY_LONG.format(new Date(Date.UTC(sy, sm - 1, sd)))}</h3>
                    {chosen.map((e) => (
                        <EventRow key={e.id} event={e} />
                    ))}
                </div>
            ) : (
                <p className={styles.hint}>Tap a date with dots to see what is on.</p>
            )}
        </section>
    );
}
