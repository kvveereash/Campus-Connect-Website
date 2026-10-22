import type { Metadata } from 'next';
import { getBuzzFeed } from '@/lib/actions/buzz';
import BuzzClient from './BuzzClient';

export const metadata: Metadata = {
    title: 'Club posts',
    description: 'What clubs across campus are posting right now.',
};

// The same feed for everyone, so it is served from the CDN and rebuilt at most
// every 30 seconds; a new post refreshes it straight away. The one per-person
// part, which clubs you can post to, is fetched by the browser.
export const revalidate = 30;

export default async function BuzzPage() {
    // Topics are derived by the client from the feed it already has, so they
    // always match what clicking one reveals.
    const posts = await getBuzzFeed();

    return <BuzzClient posts={posts} />;
}
