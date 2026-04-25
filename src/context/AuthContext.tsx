'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { toggleCollegeFollow } from '@/lib/actions';
import { toast } from 'sonner';

interface AuthContextType {
    user: User | null;
    login: (userData: User) => void;
    logout: () => void;
    registerForEvent: (eventId: string) => void;
    toggleFollow: (collegeId: string) => void;
    toggleFollowUser: (userId: string) => void;
    updateProfile: (updates: Partial<User>) => void;
    refreshUser: () => Promise<void>;
    isAuthenticated: boolean;
    isLoading: boolean;
    isInitialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);

    const checkSession = async () => {
        try {
            // Dynamically import to avoid server-only module issues if any, 
            // though actions.ts is 'use server' so it's callable from client.
            const { getSessionUser } = await import('@/lib/actions');
            const currentUser = await getSessionUser();
            // Transform backend user to match frontend User type if needed
            // The frontend User type has specific fields like badges as Array, etc.
            // Prisma return might need mapping.
            // For now assuming shapes match close enough or we cast.
            if (currentUser) {
                // Ultra-defensive mapping
                try {
                    const safeISO = (dateStr: any) => {
                        if (!dateStr) return new Date().toISOString();
                        const d = new Date(dateStr);
                        return !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
                    };

                    const safeMap = (arr: any, fn: (item: any) => any) => {
                        return Array.isArray(arr) ? arr.map(fn) : [];
                    };

                    const mappedUser: User = {
                        ...currentUser,
                        // Scalars with defaults
                        id: currentUser.id || 'unknown',
                        name: currentUser.name || 'User',
                        email: currentUser.email || '',
                        avatar: currentUser.avatar || undefined,
                        role: currentUser.role || 'USER',
                        collegeId: currentUser.collegeId || '',
                        department: currentUser.department || '',
                        year: currentUser.year || '',
                        bio: currentUser.bio || undefined,
                        resumeUrl: currentUser.resumeUrl || undefined,

                        // Dates
                        createdAt: safeISO(currentUser.createdAt),
                        updatedAt: safeISO(currentUser.updatedAt),
                        lastSeenAt: safeISO(currentUser.lastSeenAt),

                        // Relations with safe mapping
                        badges: safeMap(currentUser.badges, (ub: any) => ({
                            ...(ub.badge || {}),
                            dateEarned: safeISO(ub.dateEarned)
                        })),
                        registrations: safeMap(currentUser.registrations, (r: any) => ({
                            ...r,
                            createdAt: safeISO(r.createdAt),
                            updatedAt: safeISO(r.updatedAt)
                        })),
                        followedColleges: safeMap(currentUser.followedColleges, (c: any) => c.id || c),
                        clubMemberships: safeMap(currentUser.clubMemberships, (m: any) => ({
                            ...m,
                            joinedAt: safeISO(m.joinedAt),
                            club: m.club ? {
                                ...m.club,
                                createdAt: safeISO(m.club.createdAt),
                                updatedAt: safeISO(m.club.updatedAt)
                            } : undefined
                        })),
                        joinedClubs: safeMap(currentUser.clubMemberships, (m: any) => m.clubId),

                        // Arrays that might be missing in Prisma return but required by User type
                        skills: safeMap(currentUser.skills, (s: any) => s.name || s),
                        interests: safeMap(currentUser.interests, (i: any) => i.name || i),
                        achievements: Array.isArray(currentUser.achievements) ? currentUser.achievements : [],
                        projects: Array.isArray(currentUser.projects) ? currentUser.projects : [],
                        portfolioLinks: Array.isArray(currentUser.portfolioLinks) ? currentUser.portfolioLinks : [],
                        following: [],
                        college: currentUser.college || undefined
                    };
                    setUser(mappedUser);
                } catch (mapError) {
                    console.error('CRITICAL: User mapping failed', mapError);
                    // Fallback to minimal user if essential info exists
                    if (currentUser?.id) {
                        setUser({ ...currentUser, id: currentUser.id } as any);
                    } else {
                        setUser(null);
                    }
                }
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Session check failed', error);
            setUser(null);
        } finally {
            setIsLoading(false);
            setIsInitialized(true);
        }
    };

    useEffect(() => {
        checkSession();
    }, []);

    const login = (userData: User) => {
        // Optimistic update, but real auth is cookie based.
        // Page reload usually handles this.
        setUser(userData);
    };

    const logout = async () => {
        const { logout } = await import('@/lib/actions');
        await logout();
        setUser(null);
    };

    const registerForEvent = async (eventId: string, status: 'PENDING_PAYMENT' | 'COMPLETED' | 'PAID' = 'COMPLETED') => {
        if (!user) return;
        const currentRegistrations = user.registrations || [];
        if (!currentRegistrations.find(r => r.eventId === eventId)) {
            const newReg: any = {
                id: `temp_${Date.now()}`,
                userId: user.id,
                eventId,
                status,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            setUser({
                ...user,
                registrations: [...currentRegistrations, newReg]
            });
        }
    };

    const toggleFollow = async (collegeId: string) => {
        if (!user) return;
        const currentFollowed = user.followedColleges || [];
        const isFollowing = currentFollowed.includes(collegeId);

        // Optimistic UI
        const newFollowed = isFollowing
            ? currentFollowed.filter(id => id !== collegeId)
            : [...currentFollowed, collegeId];

        setUser({ ...user, followedColleges: newFollowed });

        // Server action
        try {
            await toggleCollegeFollow(user.id, collegeId);
        } catch (err) {
            // Revert on error
            setUser({ ...user, followedColleges: currentFollowed });
            toast.error("Failed to update follow");
        }
    };

    const toggleFollowUser = (userId: string) => {
        if (!user) return;
        // Mock implementation for user follow
        const current = user.following || [];
        const newFollowing = current.includes(userId)
            ? current.filter(id => id !== userId)
            : [...current, userId];
        setUser({ ...user, following: newFollowing });
    };

    const updateProfile = async (updates: Partial<User>) => {
        if (user) {
            setUser({ ...user, ...updates });
            try {
                const { updateUserProfile } = await import('@/lib/actions');
                await updateUserProfile(updates);
            } catch (error) {
                console.error("Failed to sync profile update", error);
                toast.error("Failed to save changes");
            }
        }
    };

    const refreshUser = async () => {
        await checkSession();
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, registerForEvent, toggleFollow, toggleFollowUser, updateProfile, refreshUser, isAuthenticated: !!user, isLoading, isInitialized }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
