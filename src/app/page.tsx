import { getUpcomingEvents } from '@/lib/actions';
import { getLandingStats, getCategoryBand, getFeaturedClubs } from '@/lib/actions/landing';
import LandingClient from './LandingClient';

// The landing page reflects live counts and the next events, so it is rendered
// per request rather than served as a build-time snapshot.
export const dynamic = 'force-dynamic';

export default async function LandingPage() {
    // Three for the "Coming up" rows, a longer run for the marquee. Both
    // come from the same cached query, so the second costs nothing.
    const [events, marqueeEvents, stats, categories, clubs] = await Promise.all([
        getUpcomingEvents(3),
        getUpcomingEvents(14),
        getLandingStats(),
        getCategoryBand(),
        getFeaturedClubs(6),
    ]);

    return (
        <LandingClient
            initialEvents={events}
            stats={stats}
            categories={categories}
            clubs={clubs}
            marquee={marqueeEvents.map((e) => ({
                id: e.id,
                label: e.title,
                meta: new Date(e.date).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                }),
                href: `/events/${e.id}`,
            }))}
        />
    );
}
