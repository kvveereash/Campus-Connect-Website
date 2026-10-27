import Link from 'next/link';
import type { ReactNode } from 'react';
import { inkFor } from '@/app/events/press';
import { formatIST } from '@/lib/format';
import { groupTimetable } from './rules';
import type { TimetableEvent } from './data';
import styles from './timetable.module.css';

type Slot = TimetableEvent & { verified?: boolean };

interface Props {
    events: Slot[];
    festStart: string;
    festEnd: string;
    /** Render time, from the page: rows that have started recede. */
    now: number;
    /** Shown in the dashed box when there are no events yet. */
    empty: { title: string; text: string; action: ReactNode };
}

const priceLabel = (price: number) => (price > 0 ? `₹${price.toLocaleString('en-IN')}` : 'Free');

/**
 * The fest day by day: one block per IST calendar day, each event a row of
 * start time, title and venue, category mark and price, linking to the
 * event. Events that have already started recede but stay listed.
 */
export default function Timetable({ events, festStart, festEnd, now, empty }: Props) {
    if (events.length === 0) {
        return (
            <div className={styles.empty}>
                <p className={styles.emptyTitle}>{empty.title}</p>
                <p className={styles.emptyText}>{empty.text}</p>
                {empty.action}
            </div>
        );
    }

    const days = groupTimetable(events, festStart, festEnd);

    return (
        <div className={styles.timetable}>
            {days.length > 1 && (
                <nav className={styles.dayNav} aria-label="Jump to a day">
                    {days.map((day) => (
                        <a key={day.key} href={`#day-${day.key}`} className={styles.dayChip}>
                            {day.dayLabel ?? formatIST(day.items[0].date, { day: 'numeric', month: 'short' })}
                            <span className={styles.dayChipCount}>{day.items.length}</span>
                        </a>
                    ))}
                </nav>
            )}

            {days.map((day) => (
                <section key={day.key} id={`day-${day.key}`} className={styles.day} aria-labelledby={`day-${day.key}-title`}>
                    <header className={styles.dayHead}>
                        {day.dayLabel && <span className={styles.dayLabel}>{day.dayLabel}</span>}
                        <h3 id={`day-${day.key}-title`} className={styles.dayTitle}>
                            {day.title}
                        </h3>
                        <span className={styles.dayCount}>
                            {day.items.length} {day.items.length === 1 ? 'event' : 'events'}
                        </span>
                    </header>

                    <ol className={styles.slots}>
                        {day.items.map((event) => {
                            const past = new Date(event.date).getTime() < now;
                            return (
                                <li key={event.id}>
                                    <Link
                                        href={`/events/${event.id}?ref=fest`}
                                        className={`${styles.slot} ${past ? styles.slotPast : ''}`}
                                        style={{ ['--cat' as string]: inkFor(event.category) }}
                                    >
                                        <time className={styles.time} dateTime={event.date}>
                                            {formatIST(event.date, { hour: 'numeric', minute: '2-digit' })}
                                        </time>
                                        <span className={styles.main}>
                                            <span className={styles.title}>{event.title}</span>
                                            <span className={styles.venue}>{event.venue}</span>
                                        </span>
                                        <span className={styles.tags}>
                                            <span className={styles.cat}>
                                                <i aria-hidden="true" />
                                                {event.category}
                                            </span>
                                            <span className={`${styles.price} ${event.price > 0 ? '' : styles.free}`}>
                                                {priceLabel(event.price)}
                                            </span>
                                            {event.verified === false && (
                                                <span className={styles.pending}>Awaiting approval</span>
                                            )}
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ol>
                </section>
            ))}
        </div>
    );
}
