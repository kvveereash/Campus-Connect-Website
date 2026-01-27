import ListSkeleton from '@/components/ListSkeleton';

export default function AdminLoading() {
    return (
        <div>
            <div style={{ marginBottom: '30px' }}>
                <div style={{ height: '40px', width: '200px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '10px' }}></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                {Array(4).fill(0).map((_, i) => (
                    <div key={i} style={{
                        height: '140px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '12px'
                    }}></div>
                ))}
            </div>

            <ListSkeleton count={3} />
        </div>
    );
}
