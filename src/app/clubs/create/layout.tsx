import type { Metadata } from 'next';

// The page itself is a client component, which cannot export metadata.
export const metadata: Metadata = {
    title: 'Start a club',
    description: 'Start a club on Campus Connect: members, events and posts in one place.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
