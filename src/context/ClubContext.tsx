'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Club, Post, User } from '@/types';
import { useAuth } from './AuthContext';

interface ClubContextType {
    clubs: Club[];
    createClub: (data: Omit<Club, 'id' | 'members' | 'admins'>) => void;
    joinClub: (clubId: string) => void;
    leaveClub: (clubId: string) => void;
    getClubPosts: (clubId: string) => Post[];
    addClubPost: (clubId: string, content: string, image?: string) => void;
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);



export function ClubProvider({ children }: { children: ReactNode }) {
    const [clubs, setClubs] = useState<Club[]>([]);
    const [clubPosts, setClubPosts] = useState<Post[]>([]);
    const { user, updateProfile } = useAuth();

    const formatClub = (c: any): Club => {
        const safeISO = (dateStr: any) => {
            if (!dateStr) return new Date().toISOString();
            const d = new Date(dateStr);
            return !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
        };

        return {
            id: c.id,
            name: c.name,
            description: c.description,
            category: c.category,
            collegeId: c.collegeId,
            image: c.logo || '/club-logo-placeholder.png',
            members: (Array.isArray(c.members) ? c.members : []).map((m: any) => ({
                ...m,
                joinedAt: safeISO(m.joinedAt)
            })),
            admins: Array.isArray(c.admins) ? c.admins : []
        };
    };

    useEffect(() => {
        // Force clear old mock data from cache
        localStorage.removeItem('clubs');

        const fetchClubs = async () => {
            console.log("--- FETCHING CLUBS FROM DB ---");
            try {
                // Import dynamically to allow client usage
                const { getClubs } = await import('@/lib/actions');
                const fetchedClubs = await getClubs();

                // Map to Club type
                const formattedClubs: Club[] = (fetchedClubs || []).map(formatClub);
                setClubs(formattedClubs);
            } catch (error) {
                console.error("Failed to fetch clubs", error);
            }
        };

        fetchClubs();

        // Posts still mock for now or local storage
        const storedPosts = localStorage.getItem('clubPosts');
        if (storedPosts) {
            setClubPosts(JSON.parse(storedPosts));
        }
    }, [user]); // Re-fetch on user change or mount

    // Helper to refresh
    const refreshClubs = async () => {
        try {
            const { getClubs } = await import('@/lib/actions');
            const fetchedClubs = await getClubs();
            const formattedClubs: Club[] = (fetchedClubs || []).map(formatClub);
            setClubs(formattedClubs);
        } catch (error) {
            console.error("Failed to refresh clubs", error);
        }
    };


    const createClub = async (data: Omit<Club, 'id' | 'members' | 'admins'>) => {
        // This should actually call server action, but sticking to Context interface for now.
        // The CreateClubPage calls the server action directly, so this context function might be redundant
        // or used for optimistic updates.
        // We generally rely on the Page to handle creation.
        await refreshClubs();
    };

    const joinClub = async (clubId: string) => {
        // TODO: Implement server action for joining club
        // For now preventing errors
        console.log("Join club not implemented in context yet");
    };

    const leaveClub = (clubId: string) => {
        // TODO: Implement server action
    };

    // ... existing posts logic ...
    const savePosts = (newPosts: Post[]) => {
        setClubPosts(newPosts);
        localStorage.setItem('clubPosts', JSON.stringify(newPosts));
    };

    const getClubPosts = (clubId: string) => {
        return clubPosts.filter(post => post.clubId === clubId);
    };

    const addClubPost = (clubId: string, content: string, image?: string) => {
        if (!user) return;
        const newPost: Post = {
            id: `post${Date.now()}`,
            author: { id: user.id, name: user.name, avatar: user.name.charAt(0) },
            content, image, likes: 0, comments: 0, timestamp: new Date().toISOString(), clubId
        };
        savePosts([newPost, ...clubPosts]);
    };

    return (
        <ClubContext.Provider value={{ clubs, createClub, joinClub, leaveClub, getClubPosts, addClubPost }}>
            {children}
        </ClubContext.Provider>
    );
}

export function useClubs() {
    const context = useContext(ClubContext);
    if (context === undefined) {
        throw new Error('useClubs must be used within a ClubProvider');
    }
    return context;
}
