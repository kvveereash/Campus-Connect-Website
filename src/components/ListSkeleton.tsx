'use client';

import Skeleton from './Skeleton';

export default function ListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {Array(count).fill(0).map((_, i) => (
                <div key={i} style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ flex: 1 }}>
                        <Skeleton width="40%" height="24px" style={{ marginBottom: '8px' }} />
                        <Skeleton width="60%" height="16px" />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <Skeleton width="36px" height="36px" borderRadius="6px" />
                        <Skeleton width="36px" height="36px" borderRadius="6px" />
                    </div>
                </div>
            ))}
        </div>
    );
}
