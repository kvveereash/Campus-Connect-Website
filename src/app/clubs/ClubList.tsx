'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';
import { resolveClubImage } from '@/lib/college-images';

// Define types locally or import from shared types if consistent
// The server action returns a specific structure, let's match it
interface Club {
    id: string;
    name: string;
    description: string;
    category: string;
    logo: string | null;
    collegeId: string;
    createdAt: string;
    updatedAt: string;
    college: { id: string; name: string };
    _count: { members: number };
}

interface User {
    id: string;
    name: string;
    // Add other fields if needed for "My Clubs" logic
    joinedClubIds?: string[]; // We might need to pass this explicitly if it's not on the user object
}

interface ClubListProps {
    initialClubs: Club[];
    user: User | null;
    joinedClubIds: string[];
}

import Search from '@/components/Search';
import EmptyState from '@/components/common/EmptyState';

function ClubCard({ club }: { club: Club }) {
    const [imgSrc, setImgSrc] = useState(resolveClubImage(club));
    const memberCount = club._count.members;

    return (
        <Link href={`/clubs/${club.id}`} className={styles.card}>
            <div className={styles.imageContainer}>
                <Image
                    src={imgSrc}
                    alt={club.name}
                    fill
                    style={{ objectFit: 'cover' }}
                    className={styles.clubImage}
                    onError={() => setImgSrc('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=800')}
                />
            </div>
            <div className={styles.content}>
                <div className={styles.category}>{club.category}</div>
                <h2 className={styles.clubName}>{club.name}</h2>
                <p className={styles.description}>
                    {club.description.length > 100
                        ? `${club.description.substring(0, 100)}...`
                        : club.description}
                </p>
                <div className={styles.footer}>
                    <span className={styles.members}>👥 {memberCount} members</span>
                </div>
            </div>
        </Link>
    );
}

export default function ClubList({ initialClubs, user, joinedClubIds }: ClubListProps) {
    const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');

    const filteredClubs = activeTab === 'all'
        ? initialClubs
        : initialClubs.filter(club => joinedClubIds.includes(club.id));

    return (
        <div className={styles.container}>
            {/* Header with Title and Create Button */}
            <div className={styles.header}>
                <h1 className={styles.title}>Student Communities</h1>
                <Link href="/clubs/create" className={styles.createButton}>
                    <span>+</span> Create Club
                </Link>
            </div>

            {/* Controls Bar: Search (Center/Left) + Tabs (Bottom) */}
            <div className={styles.controlsContainer}>
                {/* Tabs */}
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('all')}
                    >
                        All Clubs
                    </button>
                    {user && (
                        <button
                            className={`${styles.tab} ${activeTab === 'my' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('my')}
                        >
                            My Clubs
                        </button>
                    )}
                </div>

                {/* Search Bar - Positioned relative or in flex container */}
                <div className="w-full md:w-auto md:min-w-[300px]">
                    <Search placeholder="Search communities..." />
                </div>
            </div>

            {filteredClubs.length > 0 ? (
                <div className={styles.grid}>
                    {filteredClubs.map(club => (
                        <ClubCard key={club.id} club={club} />
                    ))}
                </div>
            ) : (
                <EmptyState
                    title={activeTab === 'my' ? "No Communities Found" : "No Clubs Yet"}
                    description={activeTab === 'my'
                        ? "You haven't joined any clubs yet. Explore 'All Clubs' to find your community!"
                        : "There are no clubs created on the platform yet."}
                    actionLabel={activeTab === 'my' ? "Explore All Clubs" : undefined}
                    onAction={activeTab === 'my' ? () => setActiveTab('all') : undefined}
                />
            )}
        </div>
    );
}
