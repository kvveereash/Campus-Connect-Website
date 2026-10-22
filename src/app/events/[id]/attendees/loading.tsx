import ListSkeleton from '@/components/ListSkeleton';
import Skeleton, { LoadingRegion } from '@/components/Skeleton';
import styles from '../organiser.module.css';

// Without this the event page's skeleton (a photo and facts) would stand in for the list.
export default function AttendeesLoading() {
    return (
        <LoadingRegion label="Loading attendees" className={styles.page}>
            <Skeleton width="140px" height="11px" />
            <p className={styles.label}>Attendees</p>
            <Skeleton width="min(100%, 420px)" height="48px" />
            <div className={styles.stats}>
                {Array.from({ length: 3 }, (_, i) => (
                    <Skeleton key={i} height="96px" borderRadius="var(--radius-card)" />
                ))}
            </div>
            <Skeleton height="180px" borderRadius="var(--radius-card)" style={{ marginTop: 12 }} />
            <p className={styles.label}>Who is coming</p>
            <ListSkeleton count={4} />
        </LoadingRegion>
    );
}
