import ListSkeleton from '@/components/ListSkeleton';
import Skeleton, { LoadingRegion } from '@/components/Skeleton';

export default function AdminLoading() {
    return (
        <LoadingRegion label="Loading the admin dashboard">
            <Skeleton width="200px" height="40px" style={{ marginBottom: '30px' }} />
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))',
                    gap: '20px',
                    marginBottom: '40px',
                }}
            >
                {Array.from({ length: 4 }, (_, i) => (
                    <Skeleton key={i} height="140px" borderRadius="var(--radius-card)" />
                ))}
            </div>
            <ListSkeleton count={3} />
        </LoadingRegion>
    );
}
