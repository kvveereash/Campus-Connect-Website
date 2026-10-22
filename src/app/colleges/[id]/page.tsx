import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCollegeById, getEventsByHost } from '@/lib/actions';
import { shareMetadata } from '@/lib/site';
import CollegeClient from './CollegeClient';

// Nothing on a college page depends on who is looking (following is handled
// in the browser), so each one is rendered on first visit, served from the
// CDN, and rebuilt at most every five minutes.
export const revalidate = 300;
export function generateStaticParams() {
    return [];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const college = await getCollegeById(id);
    if (!college) return { title: 'College not found' };
    const description = `Clubs and upcoming events at ${college.name}, ${college.location}.`;
    return {
        title: college.name,
        description,
        ...shareMetadata({ title: college.name, description, path: `/colleges/${id}` }),
    };
}

export default async function CollegePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const [college, events] = await Promise.all([getCollegeById(id), getEventsByHost(id)]);

    if (!college) {
        notFound();
    }

    const clubs = college.clubs.map((c) => ({
        id: c.id,
        name: c.name,
        logo: c.logo,
        category: c.category,
        description: c.description,
        members: c._count.members,
    }));

    return (
        <CollegeClient
            college={{
                id: college.id,
                name: college.name,
                location: college.location,
                logo: college.logo,
                description: college.description,
            }}
            events={events}
            clubs={clubs}
            students={college._count.students}
        />
    );
}
