import type { Metadata } from 'next';
import { getSession } from '@/lib/auth';
import { getBuzzFeed, getPostableClubs } from '@/lib/actions/buzz';
import BuzzClient from './BuzzClient';

export const metadata: Metadata = {
    title: 'Campus Buzz',
    description: 'What clubs across campus are posting right now.',
};

// The feed changes as people post, so render it per request rather than
// serving a cached snapshot.
export const dynamic = 'force-dynamic';

export default async function BuzzPage() {
    const session = await getSession();

    // Topics used to be a third query that grouped *clubs* by category, then
    // got rendered as filters over *posts* — so the numbers never matched what
    // clicking one revealed. The client derives them from the feed it already
    // has, which is both correct and one less round trip on a page that cannot
    // be cached.
    const [posts, myClubs] = await Promise.all([
        getBuzzFeed(),
        session?.userId ? getPostableClubs() : Promise.resolve([]),
    ]);

    return <BuzzClient posts={posts} myClubs={myClubs} />;
}
