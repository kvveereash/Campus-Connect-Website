import { Metadata } from 'next';
import LeaderboardsClient from './LeaderboardsClient';
import { getAllLeaderboards } from '@/lib/actions/leaderboards';

export const metadata: Metadata = {
    title: 'Leaderboards | Campus Connect',
    description: 'See top event attendees, hosts, and most active clubs on campus.',
};

export default async function LeaderboardsPage() {
    const leaderboards = await getAllLeaderboards();

    return <LeaderboardsClient data={leaderboards} />;
}
