'use client';

import { useState, useRef } from 'react';
import { useStories } from '@/context/StoryContext';
import StoryViewer from './StoryViewer';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function StoryBar() {
    const { user } = useAuth();
    const { getStoriesByUser, addStory, stories } = useStories();
    const [viewingUser, setViewingUser] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const groupedStories = getStoriesByUser();
    // Filter out current user from the list to show them separately (optional, but standard UI pattern)
    // Actually, standard pattern: My Story (first), then others.

    const myStories = groupedStories[user?.id || ''] || [];
    const otherUsers = Object.keys(groupedStories).filter(id => id !== user?.id);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            addStory(e.target.files[0]);
        }
    };

    return (
        <div style={{
            padding: '1rem 0',
            display: 'flex',
            gap: '1rem',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            marginBottom: '1rem'
        }}>
            {/* Upload / My Story */}
            <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', minWidth: '70px' }}
                onClick={() => {
                    if (myStories.length > 0) {
                        setViewingUser(user?.id || null);
                    } else {
                        fileInputRef.current?.click();
                    }
                }}
            >
                <div style={{ position: 'relative', width: '64px', height: '64px' }}>
                    <div style={{
                        width: '100%', height: '100%', borderRadius: '50%',
                        border: myStories.length > 0 ? '3px solid var(--primary-color)' : '2px solid var(--border-color)',
                        padding: '2px',
                        background: 'var(--background-color)'
                    }}>
                        <div style={{
                            width: '100%', height: '100%', borderRadius: '50%', background: 'var(--surface-color)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-color)'
                        }}>
                            {user?.name.charAt(0).toUpperCase()}
                        </div>
                    </div>
                    {myStories.length === 0 && (
                        <div style={{
                            position: 'absolute', bottom: 0, right: 0,
                            background: 'var(--primary-color)', color: 'white',
                            width: '20px', height: '20px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '14px', border: '2px solid var(--background-color)'
                        }}>+</div>
                    )}
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Your Story</span>
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                />
                {myStories.length > 0 && (
                    <div
                        style={{ fontSize: '0.65rem', color: 'var(--primary-color)' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                        }}
                    >
                        + Add
                    </div>
                )}
            </div>

            {/* Other Users */}
            {otherUsers.map(userId => {
                const userStories = groupedStories[userId];
                const avatar = userStories[0]?.userAvatar;
                const name = userStories[0]?.userName.split(' ')[0]; // First name

                return (
                    <motion.div
                        key={userId}
                        whileHover={{ scale: 1.05 }}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', minWidth: '70px' }}
                        onClick={() => setViewingUser(userId)}
                    >
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                            padding: '3px'
                        }}>
                            <div style={{
                                width: '100%', height: '100%', borderRadius: '50%', background: 'var(--background-color)',
                                padding: '2px'
                            }}>
                                <div style={{
                                    width: '100%', height: '100%', borderRadius: '50%', background: '#ddd',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
                                    overflow: 'hidden'
                                }}>
                                    {avatar.startsWith('http') ? (
                                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                            <Image
                                                src={avatar}
                                                alt={name}
                                                fill
                                                style={{ objectFit: 'cover' }}
                                            />
                                        </div>
                                    ) : (
                                        avatar
                                    )}
                                </div>
                            </div>
                        </div>
                        <span style={{ fontSize: '0.75rem' }}>{name}</span>
                    </motion.div>
                );
            })}

            {/* Viewer Modal */}
            {viewingUser && groupedStories[viewingUser] && (
                <StoryViewer
                    stories={groupedStories[viewingUser]}
                    onClose={() => setViewingUser(null)}
                />
            )}
        </div>
    );
}
