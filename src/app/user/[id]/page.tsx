'use client';

import { useParams, notFound, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { User, Project, PortfolioLink } from '@/types';
import styles from './page.module.css';
import { startConversation } from '@/lib/actions/chat';
import { toast } from 'sonner';

// Mock Data for other users (simulate backend fetch)
const MOCK_USERS_DB: Record<string, Partial<User>> = {
    'u2': {
        id: 'u2',
        name: 'Sarah Chen',
        collegeId: 'c1',
        department: 'Computer Science',
        year: '3rd Year',
        bio: 'Full stack developer passionate about accessible web design. Tech Lead at Coding Club.',
        skills: ['React', 'Node.js', 'TypeScript', 'UI/UX'],
        followers: ['u1', 'u3', 'u4'],
        following: ['u1'],
        projects: [
            { id: 'p1', title: 'EcoTrack', description: 'Carbon footprint calculator app' },
            { id: 'p2', title: 'ConnectAPI', description: 'GraphQL API for student events' }
        ],
        portfolioLinks: [
            { id: 'l1', platform: 'GitHub', url: 'https://github.com/sarahcodes' }
        ]
    },
    'u3': {
        id: 'u3',
        name: 'Mike Ross',
        collegeId: 'c2',
        department: 'Information Technology',
        year: '4th Year',
        bio: 'Aspiring Product Manager. Hackathon junkie. Always building.',
        skills: ['Product Management', 'Python', 'Data Analysis'],
        followers: ['u2'],
        following: ['u2', 'u1'],
        projects: [
            { id: 'p3', title: 'CampusMart', description: 'Buy/Sell marketplace for students' }
        ]
    }
};

export default function UserProfile() {
    const params = useParams();
    const router = useRouter();
    const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const { user: currentUser, toggleFollowUser } = useAuth();

    // In a real app, this would be a fetch call
    const profileUser = id === currentUser?.id ? currentUser : (id ? (MOCK_USERS_DB[id] as User) : null);

    if (!profileUser) {
        // You might handle loading state here or return not found
        if (id && !MOCK_USERS_DB[id] && id !== currentUser?.id) return notFound();
        return <div>Loading...</div>;
    }

    const isMe = currentUser?.id === profileUser.id;
    const isFollowing = currentUser?.following?.includes(profileUser.id);
    const followerCount = (profileUser.followers?.length || 0) + (isFollowing && !profileUser.followers?.includes(currentUser?.id || '') ? 1 : 0) - (!isFollowing && profileUser.followers?.includes(currentUser?.id || '') ? 1 : 0);

    return (
        <div className={styles.container}>
            {/* Header Card */}
            <div className={styles.headerCard}>
                <div className={styles.avatar}>
                    {profileUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h1 className={styles.name}>{profileUser.name}</h1>
                    <p className={styles.role}>{profileUser.year} • {profileUser.department}</p>
                    {profileUser.bio && <p className={styles.bio}>{profileUser.bio}</p>}
                </div>

                <div className={styles.stats}>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{followerCount}</span>
                        <span className={styles.statLabel}>Followers</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{profileUser.following?.length || 0}</span>
                        <span className={styles.statLabel}>Following</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{profileUser.projects?.length || 0}</span>
                        <span className={styles.statLabel}>Projects</span>
                    </div>
                </div>

                {!isMe && currentUser && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button
                            className={`btn ${isFollowing ? 'btn-outline' : 'btn-primary'}`}
                            style={{ minWidth: '120px' }}
                            onClick={() => toggleFollowUser(profileUser.id)}
                        >
                            {isFollowing ? 'Following' : 'Follow'}
                        </button>
                        <button
                            className="btn btn-secondary"
                            style={{ minWidth: '120px', background: '#333', color: 'white', border: '1px solid #444' }}
                            onClick={async () => {
                                try {
                                    if (!profileUser?.id) return toast.error('Invalid user ID');

                                    const result = await startConversation(profileUser.id);

                                    if (result.success && result.data) {
                                        router.push(`/messages?c=${result.data}`);
                                    } else {
                                        console.error('Chat error:', result.error);
                                        toast.error(result.error || 'Failed to start chat');
                                    }
                                } catch (err: any) {
                                    console.error('Chat exception:', err);
                                    toast.error(err?.message || 'Something went wrong');
                                }
                            }}
                        >
                            Message 💬
                        </button>
                    </div>
                )}
            </div>

            {/* Skills */}
            {profileUser.skills && profileUser.skills.length > 0 && (
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>skills</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {profileUser.skills.map(skill => (
                            <span key={skill} className={styles.skillTag}>{skill}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Projects */}
            {profileUser.projects && profileUser.projects.length > 0 && (
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Projects</h3>
                    {profileUser.projects.map(project => (
                        <div key={project.id} className={styles.projectCard}>
                            <h4 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{project.title}</h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{project.description}</p>
                            {project.link && (
                                <a href={project.link} target="_blank" style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--primary-color)' }}>
                                    View Project →
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Links */}
            {profileUser.portfolioLinks && profileUser.portfolioLinks.length > 0 && (
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Links</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {profileUser.portfolioLinks.map(link => (
                            <a key={link.id} href={link.url} target="_blank" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)' }}>
                                🔗 {link.platform}
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

