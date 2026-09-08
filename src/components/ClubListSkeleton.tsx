/**
 * Loading placeholder for the clubs list.
 *
 * This lives as a component rather than `app/clubs/loading.tsx` on purpose: a
 * loading.tsx at that segment also wraps `/clubs/[id]`, which starts streaming
 * the response. Once streaming begins the HTTP status is already committed, so
 * `notFound()` on a missing club could no longer return a real 404 — it sent
 * 200 with an empty body. Scoping the boundary to the list page fixes that.
 */
export default function ClubListSkeleton() {
    return (
        <div style={{ paddingTop: '2rem' }}>
            <div
                style={{
                    height: '48px',
                    width: '300px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    marginBottom: '2rem',
                }}
            />

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '2rem',
                }}
            >
                {Array(6)
                    .fill(0)
                    .map((_, i) => (
                        <div
                            key={i}
                            style={{
                                height: '350px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                borderRadius: '16px',
                            }}
                        />
                    ))}
            </div>
        </div>
    );
}
