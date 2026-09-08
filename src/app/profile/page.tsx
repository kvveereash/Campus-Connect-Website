import { Metadata } from 'next';
import ProfileClient from './ProfileClient';
import { ClubProvider } from '@/context/ClubContext';

export const metadata: Metadata = {
    title: 'My Profile',
    description: 'Manage your events, achievements, and network on Campus Connect.',
};

export default function ProfilePage() {
    // ClubProvider used to sit in the root layout, which meant every page in
    // the app fetched the full club list on mount. This screen is its only
    // consumer, so it owns the provider now.
    return (
        <ClubProvider>
            <ProfileClient />
        </ClubProvider>
    );
}
