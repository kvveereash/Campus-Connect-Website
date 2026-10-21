import type { Metadata } from 'next';
import { getAllColleges } from '@/lib/actions';

export const metadata: Metadata = {
    title: 'Colleges',
    description: 'Every campus on Campus Connect, with its clubs and upcoming events.',
};
import CollegesClient from './CollegesClient';

export default async function CollegesPage() {
    const colleges = await getAllColleges();

    return (
        <CollegesClient initialColleges={colleges} />
    );
}
