import { getAllColleges } from '@/lib/actions';
import CollegesClient from './CollegesClient';

export default async function CollegesPage() {
    const colleges = await getAllColleges();

    return (
        <CollegesClient initialColleges={colleges} />
    );
}
