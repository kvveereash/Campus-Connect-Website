import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublicProfile, getPublicProfileEvents } from '@/lib/actions/profile';
import PublicProfileClient from './PublicProfileClient';

interface PageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const user = await getPublicProfile(id);

    if (!user) return { title: 'Profile not found' };

    return {
        title: user.name,
        description: user.bio || `${user.name}'s profile on Campus Connect.`,
    };
}

export default async function PublicProfilePage({ params }: PageProps) {
    const { id } = await params;

    const user = await getPublicProfile(id);
    if (!user) notFound();

    const { registered, hosted } = await getPublicProfileEvents(id);

    return <PublicProfileClient user={user} registered={registered} hosted={hosted} />;
}
