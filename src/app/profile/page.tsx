import { Metadata } from 'next';
import ProfileClient from './ProfileClient';

export const metadata: Metadata = {
    title: 'My Profile',
    description: 'Manage your events, achievements, and network on Campus Connect.',
};

export default function ProfilePage() {
    return <ProfileClient />;
}
