import { getUpcomingEvents } from '@/lib/actions';
import { getLandingStats, getCategoryBand, getFeaturedClubs } from '@/lib/actions/landing';
import { getAllColleges } from '@/lib/actions/colleges';
import Landing from './Landing';

// The landing page reflects live counts and the next events, so it is rendered
// per request rather than served as a build-time snapshot.
export const dynamic = 'force-dynamic';

export default async function LandingPage() {
    // Three for the "Coming up" rows, a longer run for the marquee. Both
    // come from the same cached query, so the second costs nothing.
    const [events, marqueeEvents, stats, categories, clubs, allColleges] = await Promise.all([
        getUpcomingEvents(3),
        getUpcomingEvents(14),
        getLandingStats(),
        getCategoryBand(),
        getFeaturedClubs(6),
        getAllColleges(),
    ]);

    // The wall leads with the campuses that have the most going on.
    const colleges = [...allColleges]
        .sort((a, b) => b.clubs + b.events - (a.clubs + a.events))
        .slice(0, 10)
        .map(({ id, name, location, clubs, events }) => ({ id, name, location, clubs, events }));

    return (
        <Landing
            initialEvents={events}
            stats={stats}
            categories={categories}
            clubs={clubs}
            colleges={colleges}
            marquee={marqueeEvents.map((e) => ({
                id: e.id,
                label: e.title,
                meta: new Date(e.date).toLocaleDateString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    day: 'numeric',
                    month: 'short',
                }),
                href: `/events/${e.id}`,
            }))}
        />
    );
}
