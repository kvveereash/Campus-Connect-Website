import type { Metadata } from 'next';

// The page itself is a client component, which cannot export metadata.
export const metadata: Metadata = {
    title: 'Host an event',
    description: "Put your club's next event on the board.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
