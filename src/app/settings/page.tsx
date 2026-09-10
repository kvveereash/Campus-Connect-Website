import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import SettingsClient from './SettingsClient';

export const metadata: Metadata = {
    title: 'Settings',
    description: 'Change your password or delete your account.',
    robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const session = await getSession();
    if (!session?.userId) redirect('/login?redirect=%2Fsettings');

    // Only the email, which is the one thing this page displays. A deleted
    // account cannot reach its own settings.
    /* emailVerified arrives with a migration, and this page must not break on
       a database that has not had it yet — losing the ability to change your
       password because a new column is missing would be a poor trade. If the
       select fails, fall back to the email alone and treat the address as
       unconfirmed. */
    let email: string | null = null;
    let verified = false;
    try {
        const user = await prisma.user.findFirst({
            where: { id: session.userId as string, deletedAt: null },
            select: { email: true, emailVerified: true },
        });
        email = user?.email ?? null;
        verified = user?.emailVerified !== null && user?.emailVerified !== undefined;
    } catch {
        const user = await prisma.user.findFirst({
            where: { id: session.userId as string, deletedAt: null },
            select: { email: true },
        });
        email = user?.email ?? null;
    }

    if (!email) redirect('/login');

    return <SettingsClient email={email} verified={verified} />;
}
