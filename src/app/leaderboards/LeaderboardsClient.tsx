'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { LeaderboardUser, LeaderboardClub } from '@/lib/actions/leaderboards';

interface LeaderboardsData {
    attendees: LeaderboardUser[];
    hosts: LeaderboardUser[];
    clubs: LeaderboardClub[];
    badges: LeaderboardUser[];
}

const TABS = [
    { id: 'attendees', label: '🎟️ Top Attendees', description: 'Most events attended' },
    { id: 'hosts', label: '🎤 Top Hosts', description: 'Most events created' },
    { id: 'clubs', label: '🏆 Top Clubs', description: 'Most active clubs' },
    { id: 'badges', label: '🏅 Badge Leaders', description: 'Most badges earned' },
];

export default function LeaderboardsClient({ data }: { data: LeaderboardsData }) {
    const [activeTab, setActiveTab] = useState('attendees');

    const getRankStyle = (rank: number) => {
        switch (rank) {
            case 1: return { background: 'linear-gradient(135deg, #ffd700, #ffed4a)', color: '#1a1a1a' };
            case 2: return { background: 'linear-gradient(135deg, #c0c0c0, #e8e8e8)', color: '#1a1a1a' };
            case 3: return { background: 'linear-gradient(135deg, #cd7f32, #daa06d)', color: '#1a1a1a' };
            default: return { background: 'var(--surface-color)', color: 'var(--text-primary)' };
        }
    };

    const getRankEmoji = (rank: number) => {
        switch (rank) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return `#${rank}`;
        }
    };

    const UserCard = ({ user, scoreLabel }: { user: LeaderboardUser; scoreLabel: string }) => (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: user.rank * 0.05 }}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                background: user.rank <= 3 ? 'rgba(255, 215, 0, 0.05)' : 'var(--background-color)',
                borderRadius: '0.75rem',
                border: user.rank <= 3 ? '2px solid rgba(255, 215, 0, 0.2)' : '1px solid var(--border-color)',
            }}
        >
            {/* Rank Badge */}
            <div style={{
                ...getRankStyle(user.rank),
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: user.rank <= 3 ? '1.25rem' : '0.875rem',
                flexShrink: 0
            }}>
                {getRankEmoji(user.rank)}
            </div>

            {/* Avatar */}
            {user.avatar ? (
                <Image
                    src={user.avatar}
                    alt={user.name}
                    width={48}
                    height={48}
                    style={{ borderRadius: '50%', objectFit: 'cover' }}
                />
            ) : (
                <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'var(--primary-color)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.25rem'
                }}>
                    {user.name.charAt(0)}
                </div>
            )}

            {/* Info */}
            <div style={{ flex: 1 }}>
                <Link href={`/profile/${user.id}`} style={{ textDecoration: 'none' }}>
                    <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>{user.name}</p>
                </Link>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{user.college}</p>
            </div>

            {/* Score */}
            <div style={{ textAlign: 'right' }}>
                <p style={{ fontWeight: 700, fontSize: '1.5rem', color: 'var(--primary-color)' }}>{user.score}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{scoreLabel}</p>
            </div>
        </motion.div>
    );

    const ClubCard = ({ club }: { club: LeaderboardClub }) => (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: club.rank * 0.05 }}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                background: club.rank <= 3 ? 'rgba(255, 215, 0, 0.05)' : 'var(--background-color)',
                borderRadius: '0.75rem',
                border: club.rank <= 3 ? '2px solid rgba(255, 215, 0, 0.2)' : '1px solid var(--border-color)',
            }}
        >
            {/* Rank Badge */}
            <div style={{
                ...getRankStyle(club.rank),
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: club.rank <= 3 ? '1.25rem' : '0.875rem',
                flexShrink: 0
            }}>
                {getRankEmoji(club.rank)}
            </div>

            {/* Logo */}
            {club.logo ? (
                <Image
                    src={club.logo}
                    alt={club.name}
                    width={48}
                    height={48}
                    style={{ borderRadius: '0.5rem', objectFit: 'cover' }}
                />
            ) : (
                <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '0.5rem',
                    background: 'var(--secondary-color)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.25rem'
                }}>
                    {club.name.charAt(0)}
                </div>
            )}

            {/* Info */}
            <div style={{ flex: 1 }}>
                <Link href={`/clubs/${club.id}`} style={{ textDecoration: 'none' }}>
                    <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>{club.name}</p>
                </Link>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{club.college}</p>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '1.5rem', textAlign: 'center' }}>
                <div>
                    <p style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary-color)' }}>{club.memberCount}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Members</p>
                </div>
                <div>
                    <p style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--secondary-color)' }}>{club.eventCount}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Events</p>
                </div>
            </div>
        </motion.div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'attendees':
                return data.attendees.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {data.attendees.map(user => (
                            <UserCard key={user.id} user={user} scoreLabel="events" />
                        ))}
                    </div>
                ) : (
                    <EmptyState message="No attendees yet. Be the first to attend events!" />
                );

            case 'hosts':
                return data.hosts.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {data.hosts.map(user => (
                            <UserCard key={user.id} user={user} scoreLabel="events hosted" />
                        ))}
                    </div>
                ) : (
                    <EmptyState message="No event hosts yet. Create an event to appear here!" />
                );

            case 'clubs':
                return data.clubs.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {data.clubs.map(club => (
                            <ClubCard key={club.id} club={club} />
                        ))}
                    </div>
                ) : (
                    <EmptyState message="No clubs yet. Start a club to appear here!" />
                );

            case 'badges':
                return data.badges.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {data.badges.map(user => (
                            <UserCard key={user.id} user={user} scoreLabel="badges" />
                        ))}
                    </div>
                ) : (
                    <EmptyState message="No badges earned yet. Participate in events to earn badges!" />
                );

            default:
                return null;
        }
    };

    const EmptyState = ({ message }: { message: string }) => (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</p>
            <p>{message}</p>
        </div>
    );

    return (
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ textAlign: 'center', marginBottom: '2rem' }}
            >
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                    🏆 Leaderboards
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                    See who's making waves on campus!
                </p>
            </motion.div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                overflowX: 'auto',
                paddingBottom: '0.5rem'
            }}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '0.75rem 1.25rem',
                            borderRadius: '0.75rem',
                            border: 'none',
                            background: activeTab === tab.id ? 'var(--primary-color)' : 'var(--surface-color)',
                            color: activeTab === tab.id ? 'white' : 'var(--text-primary)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Description */}
            <p style={{
                color: 'var(--text-secondary)',
                marginBottom: '1rem',
                fontSize: '0.9rem'
            }}>
                {TABS.find(t => t.id === activeTab)?.description}
            </p>

            {/* Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {renderContent()}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
