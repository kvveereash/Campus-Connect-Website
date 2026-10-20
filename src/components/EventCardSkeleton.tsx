'use client';

import Skeleton from './Skeleton';
import styles from './EventCard.module.css';

/** Placeholder in the exact shape of EventCard, so nothing jumps when it loads. */
export default function EventCardSkeleton() {
    return (
        <div className={styles.card} aria-hidden="true">
            <div className={styles.media}>
                <Skeleton height="100%" borderRadius="0" />
            </div>
            <div className={styles.body}>
                <Skeleton width="90px" height="12px" />
                <Skeleton width="80%" height="22px" style={{ marginTop: 4 }} />
                <Skeleton width="60%" height="16px" />
                <div className={styles.foot}>
                    <Skeleton width="56px" height="26px" borderRadius="999px" />
                    <Skeleton width="64px" height="14px" />
                </div>
            </div>
        </div>
    );
}
