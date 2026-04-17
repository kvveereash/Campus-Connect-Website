import { getPendingContent } from '@/lib/data/admin';
import VerificationClient from './VerificationClient';
import ListSkeleton from '@/components/ListSkeleton';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

async function VerificationData() {
    const data = await getPendingContent();
    return <VerificationClient initialData={data} />;
}

export default function VerificationPage() {
    return (
        <Suspense fallback={
            <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '20px' }}>Verification Queue</h1>
                <div style={{ marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '15px', color: '#a1a1aa' }}>Loading content...</h2>
                    <ListSkeleton count={4} />
                </div>
            </div>
        }>
            <VerificationData />
        </Suspense>
    );
}
