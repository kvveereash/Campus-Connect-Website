import type { Metadata } from 'next';

// The page itself is a client component, which cannot export metadata.
export const metadata: Metadata = {
    title: 'Reset your password',
    description: 'Get a link to reset your Campus Connect password.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
