import Skeleton from './Skeleton';

export default function ListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Array.from({ length: count }, (_, i) => (
                <div
                    key={i}
                    style={{
                        background: 'var(--color-paper)',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: 'var(--radius-card)',
                        padding: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '16px',
                    }}
                >
                    <div style={{ flex: 1, display: 'grid', gap: '8px' }}>
                        <Skeleton width="40%" height="20px" />
                        <Skeleton width="60%" height="14px" />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <Skeleton width="36px" height="36px" borderRadius="999px" />
                        <Skeleton width="36px" height="36px" borderRadius="999px" />
                    </div>
                </div>
            ))}
        </div>
    );
}
