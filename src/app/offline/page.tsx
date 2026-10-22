import type { Metadata } from 'next';
import Link from 'next/link';
import ProblemPage from '@/components/ProblemPage';

export const metadata: Metadata = { title: 'Offline', robots: { index: false } };

/* Served by the service worker (public/sw.js) when a page cannot be fetched.
   Static, so it is cached once and needs nothing from the network. */
export default function OfflinePage() {
    return (
        <ProblemPage
            kicker="No connection"
            title={
                <>
                    You are <em className="accent">offline.</em>
                </>
            }
            text="Events, club posts and messages need the internet. This page will load again as soon as you are back online."
            actions={
                // No prefetch: offline it would only fail. On click, a router
                // fetch that fails falls back to a full load, which is the retry.
                <Link href="/" prefetch={false} className="btn btn-primary">
                    Try again
                </Link>
            }
        />
    );
}
