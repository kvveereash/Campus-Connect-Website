import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import EventCard from '@/components/EventCard';
import EventCardSkeleton from '@/components/EventCardSkeleton';
import type { EventWithRelations } from '@/lib/actions/events';
import styles from '@/app/profile/page.module.css';

interface EventSectionProps {
    kicker: string;
    title: string;
    events: EventWithRelations[];
    loading?: boolean;
    empty: { title: string; text: string };
    /** A link in the header (and in the empty state), e.g. "Find events". */
    action?: { label: string; href: string };
}

/** One white sheet of event cards on a profile, with a dotted box when empty. */
export default function EventSection({ kicker, title, events, loading, empty, action }: EventSectionProps) {
    return (
        <section className={styles.card}>
            <div className={styles.cardHeader}>
                <div>
                    <span className={styles.cardKicker}>{kicker}</span>
                    <h2 className={styles.cardTitle}>
                        {title}
                        {!loading && <span className={styles.countPill}>{events.length}</span>}
                    </h2>
                </div>
                {action && events.length > 0 && (
                    <Link href={action.href} className={styles.headLink}>
                        {action.label} <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                )}
            </div>

            {loading ? (
                <div className={styles.eventsGrid}>
                    <EventCardSkeleton />
                    <EventCardSkeleton />
                    <EventCardSkeleton />
                </div>
            ) : events.length > 0 ? (
                <div className={styles.eventsGrid} data-reveal-group>
                    {events.map((event, i) => (
                        <EventCard key={event.id} event={event} index={i} />
                    ))}
                </div>
            ) : (
                <div className={`${styles.empty} ${styles.emptyBox}`}>
                    <p className={styles.emptyTitle}>{empty.title}</p>
                    <p>{empty.text}</p>
                    {action && (
                        <Link href={action.href} className={styles.headLink}>
                            {action.label} <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                    )}
                </div>
            )}
        </section>
    );
}
