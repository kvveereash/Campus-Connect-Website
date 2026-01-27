'use client';

import Skeleton from './Skeleton';
import styles from './EventCard.module.css'; // Assuming we can reuse card styles or just inline basic structure

export default function EventCardSkeleton() {
    return (
        <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Thumbnail */}
            <Skeleton height="180px" borderRadius="1rem" style={{ marginBottom: '1rem' }} />

            {/* Content */}
            <div style={{ padding: '0.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <Skeleton width="80px" height="24px" borderRadius="2rem" />
                    <Skeleton width="100px" height="20px" />
                </div>

                <Skeleton width="80%" height="28px" style={{ marginBottom: '0.5rem' }} />

                <div style={{ margin: '0.5rem 0' }}>
                    <Skeleton width="60%" height="20px" style={{ marginBottom: '0.25rem' }} />
                    <Skeleton width="40%" height="20px" />
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                    <Skeleton width="60px" height="32px" borderRadius="0.5rem" />
                    <Skeleton width="100px" height="40px" borderRadius="0.5rem" />
                </div>
            </div>
        </div>
    );
}
