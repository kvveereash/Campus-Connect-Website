
import { notFound } from 'next/navigation';
import { getCollegeById, getEventsByHost } from '@/lib/actions';
import CollegeClient from './CollegeClient';

// Server Component
export default async function CollegePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    // Fetch data in parallel
    const [college, events] = await Promise.all([
        getCollegeById(id),
        getEventsByHost(id)
    ]);

    if (!college) {
        notFound();
    }

    return <CollegeClient college={college} events={events} clubs={college.clubs} />;
}
