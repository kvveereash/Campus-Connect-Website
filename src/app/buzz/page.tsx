import type { Metadata } from 'next';
import { getSession } from '@/lib/auth';
import { getBuzzFeed, getPostableClubs, getBuzzTopics } from '@/lib/actions/buzz';
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

    const [posts, topics, myClubs] = await Promise.all([
        getBuzzFeed(),
        getBuzzTopics(),
        session?.userId ? getPostableClubs(session.userId as string) : Promise.resolve([]),
    ]);

    return <BuzzClient posts={posts} topics={topics} myClubs={myClubs} />;
}
