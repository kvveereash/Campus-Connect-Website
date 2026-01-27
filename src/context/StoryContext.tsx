'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Story } from '@/types';
import { MOCK_USER } from '@/lib/data';

interface StoryContextType {
    stories: Story[];
    addStory: (file: File) => void;
    getStoriesByUser: () => Record<string, Story[]>;
}

const StoryContext = createContext<StoryContextType | undefined>(undefined);

export function StoryProvider({ children }: { children: ReactNode }) {
    const [stories, setStories] = useState<Story[]>([]);

    // Internal Mock Data Initialization
    useEffect(() => {
        // Check if we have local storage stories, else seed some
        const saved = localStorage.getItem('cc_stories');
        let loadedStories: Story[] = [];
        if (saved) {
            try {
                loadedStories = JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse stories', e);
            }
        }

        // Check if we have valid active stories AND they have the new profile pics (URLs)
        const now = new Date();
        const hasActiveStories = loadedStories.some(s => new Date(s.expiresAt) > now);
        const hasNewAvatars = loadedStories.some(s => s.userAvatar && s.userAvatar.startsWith('http'));

        if (loadedStories.length > 0 && hasActiveStories && hasNewAvatars) {
            setStories(loadedStories);
        } else {
            // Seed data if storage is empty, invalid, expired, or has old avatars
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            const seed: Story[] = [
                {
                    id: '1',
                    userId: 'user2',
                    userName: 'Sarah Chen',
                    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150',
                    mediaUrl: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=1000&auto=format&fit=crop', // Coding/Hackathon
                    mediaType: 'image',
                    createdAt: new Date(now.getTime() - 1000 * 60 * 60).toISOString(),
                    expiresAt: tomorrow.toISOString()
                },
                {
                    id: '2',
                    userId: 'user3',
                    userName: 'Mike Ross',
                    userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150',
                    mediaUrl: 'https://images.unsplash.com/photo-1525130413897-71995d68b3cf?q=80&w=1000&auto=format&fit=crop', // Concert/Crowd
                    mediaType: 'image',
                    createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString(),
                    expiresAt: tomorrow.toISOString()
                },
                {
                    id: '3',
                    userId: 'user4',
                    userName: 'Alex Wong',
                    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150',
                    mediaUrl: 'https://images.unsplash.com/photo-1576633587382-13ddf37b1fc1?q=80&w=1000&auto=format&fit=crop', // Sports/Basketball
                    mediaType: 'image',
                    createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 4).toISOString(),
                    expiresAt: tomorrow.toISOString()
                },
                {
                    id: '4',
                    userId: 'user5',
                    userName: 'Priya P',
                    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150',
                    mediaUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=1000&auto=format&fit=crop', // Campus Sunset
                    mediaType: 'image',
                    createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 5).toISOString(),
                    expiresAt: tomorrow.toISOString()
                }
            ];
            setStories(seed);
        }
    }, []);

    // Save to local storage on change
    useEffect(() => {
        if (stories.length > 0) {
            localStorage.setItem('cc_stories', JSON.stringify(stories));
        }
    }, [stories]);

    const addStory = (file: File) => {
        // In a real app, upload to storage. Here, create a fake URL (or use FileReader for local preview)
        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) {
                const now = new Date();
                const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h expiry

                const newStory: Story = {
                    id: Date.now().toString(),
                    userId: MOCK_USER.id,
                    userName: MOCK_USER.name,
                    userAvatar: MOCK_USER.name.charAt(0).toUpperCase(), // Simplified
                    mediaUrl: e.target.result as string,
                    mediaType: file.type.startsWith('video') ? 'video' : 'image',
                    createdAt: now.toISOString(),
                    expiresAt: tomorrow.toISOString()
                };

                setStories(prev => [newStory, ...prev]);
            }
        };
        reader.readAsDataURL(file);
    };

    const getStoriesByUser = () => {
        const now = new Date();
        const active = stories.filter(s => new Date(s.expiresAt) > now);

        // Group by User
        const grouped: Record<string, Story[]> = {};
        active.forEach(story => {
            if (!grouped[story.userId]) grouped[story.userId] = [];
            grouped[story.userId].push(story);
        });

        return grouped;
    };

    return (
        <StoryContext.Provider value={{ stories, addStory, getStoriesByUser }}>
            {children}
        </StoryContext.Provider>
    );
}

export const useStories = () => {
    const context = useContext(StoryContext);
    if (context === undefined) {
        throw new Error('useStories must be used within a StoryProvider');
    }
    return context;
};
