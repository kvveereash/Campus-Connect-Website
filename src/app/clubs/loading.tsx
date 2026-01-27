import ListSkeleton from '@/components/ListSkeleton';

export default function ClubsLoading() {
    return (
        <div style={{ paddingTop: '2rem' }}>
            <div style={{
                height: '48px',
                width: '300px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
                marginBottom: '2rem'
            }}></div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '2rem'
            }}>
                {Array(6).fill(0).map((_, i) => (
                    <div key={i} style={{
                        height: '350px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '16px'
                    }}></div>
                ))}
            </div>
        </div>
    );
}
