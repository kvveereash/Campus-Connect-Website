import prisma from '@/lib/db';
import nextDynamic from 'next/dynamic';

const MapClient = nextDynamic(() => import('./MapClient'), {
    loading: () => <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Loading Map...</div>
});

export const dynamic = 'force-dynamic';

export default async function MapPage() {
    const events = await prisma.event.findMany({
        where: {
            date: {
                gte: new Date(), // Only future events
            },
        },
        orderBy: {
            date: 'asc',
        },
        select: {
            id: true,
            title: true,
            venue: true,
            date: true,
            category: true,
        }
    });

    return <MapClient events={events} />;
}
