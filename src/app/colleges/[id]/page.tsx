import { notFound } from 'next/navigation';
import { getCollegeById, getEventsByHost } from '@/lib/actions';
import CollegeClient from './CollegeClient';

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
