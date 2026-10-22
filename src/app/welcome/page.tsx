import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { getAllColleges } from '@/lib/actions/colleges';
import WelcomeForm from './WelcomeForm';

export const metadata: Metadata = {
    title: 'Welcome',
    description: 'Pick your college and what you are into, so the board starts with you.',
};

/*
 * Straight after sign-up: two questions, three taps. Without them the home
 * page, "My college" and the picks have nothing to go on, and the profile
 * page where they live is not where a new student looks first. Skippable.
 */
export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
    const session = await getSession();
    if (!session?.userId) redirect('/login?redirect=%2Fwelcome');
    const { redirect: next } = await searchParams;

    const [colleges, interests, me] = await Promise.all([
        getAllColleges(),
        prisma.interest.findMany({ select: { name: true }, orderBy: { name: 'asc' }, take: 60 }),
        prisma.user.findUnique({
            where: { id: session.userId as string },
            select: { collegeId: true, interests: { select: { name: true } } },
        }),
    ]);

    return (
        <WelcomeForm
            firstName={(session.user?.name || '').trim().split(/\s+/)[0] || 'there'}
            colleges={colleges.map((c) => ({ id: c.id, name: c.name, location: c.location }))}
            interests={interests.map((i) => i.name)}
            currentCollegeId={me?.collegeId ?? ''}
            currentInterests={me?.interests.map((i) => i.name) ?? []}
            next={next ?? null}
        />
    );
}
