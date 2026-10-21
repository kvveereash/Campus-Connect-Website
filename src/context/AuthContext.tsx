'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Achievement, ClubMember, EventRegistration, PortfolioLink, Project, User } from '@/types';
import type { getSessionUser } from '@/lib/actions';
import { toggleCollegeFollow } from '@/lib/actions';
import { toast } from 'sonner';

interface AuthContextType {
    user: User | null;
    login: (userData: User) => void;
    logout: () => void;
    registerForEvent: (eventId: string) => void;
    toggleFollow: (collegeId: string) => void;
    toggleFollowUser: (userId: string) => void;
    updateProfile: (updates: Partial<User> & { customCollegeName?: string }) => Promise<boolean>;
    refreshUser: () => Promise<void>;
    isAuthenticated: boolean;
    isLoading: boolean;
    isInitialized: boolean;
}

const PROFILE_FIELDS = [
    'name', 'bio', 'department', 'year', 'avatar', 'resumeUrl', 'skills', 'interests',
    'achievements', 'projects', 'portfolioLinks', 'collegeId', 'customCollegeName',
] as const;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

/** A date from the server as an ISO string; now, if it is missing or bad. */
function iso(value: Date | string | null | undefined): string {
    const d = value ? new Date(value) : null;
    return d && !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
}

/** The profile editor's JSON columns arrive parsed; anything else is empty. */
function list<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

/** The server's user, in the shape the client components use. */
function toClientUser(u: SessionUser): User {
    return {
        id: u.id,
        name: u.name || 'User',
        email: u.email || '',
        avatar: u.avatar || undefined,
        role: u.role || 'USER',
        collegeId: u.collegeId || '',
        department: u.department || '',
        year: u.year || '',
        bio: u.bio || undefined,
        resumeUrl: u.resumeUrl || undefined,
        createdAt: iso(u.createdAt),
        updatedAt: iso(u.updatedAt),
        lastSeenAt: iso(u.lastSeenAt),
        badges: u.badges.map((ub) => ({ ...ub.badge, dateEarned: iso(ub.dateEarned) })),
        registrations: u.registrations.map((r) => ({
            ...r,
            userId: u.id,
            status: r.status as EventRegistration['status'],
            createdAt: iso(r.createdAt),
            updatedAt: iso(r.updatedAt),
        })),
        followedColleges: u.followedColleges,
        clubMemberships: u.clubMemberships.map((m) => ({
            id: `${u.id}:${m.clubId}`,
            userId: u.id,
            clubId: m.clubId,
            role: m.role as ClubMember['role'],
            joinedAt: iso(m.joinedAt),
            club: m.club
                ? {
                      ...m.club,
                      logo: m.club.logo ?? undefined,
                      createdAt: iso(m.club.createdAt),
                      updatedAt: iso(m.club.updatedAt),
                  }
                : undefined,
        })),
        joinedClubs: u.clubMemberships.map((m) => m.clubId),
        skills: u.skills,
        interests: u.interests,
        achievements: list<Achievement>(u.achievements),
        projects: list<Project>(u.projects),
        portfolioLinks: list<PortfolioLink>(u.portfolioLinks),
        following: [],
        college: u.college ?? undefined,
    };
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);

    /* Loads the signed-in user, or null. State is set by the callers, in
       a promise callback, so the effect below never sets state synchronously. */
    const loadUser = async (): Promise<User | null> => {
        try {
            // Imported lazily so the provider does not pull every action into
            // the first bundle.
            const { getSessionUser } = await import('@/lib/actions');
            const sessionUser = await getSessionUser();
            return sessionUser ? toClientUser(sessionUser) : null;
        } catch (error) {
            console.error('Session check failed', error);
            return null;
        }
    };

    const applyUser = (next: User | null) => {
        setUser(next);
        setIsLoading(false);
        setIsInitialized(true);
    };

    useEffect(() => {
        let cancelled = false;
        loadUser().then((next) => {
            if (!cancelled) applyUser(next);
        });
        return () => {
            cancelled = true;
        };
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
            const newReg: EventRegistration = {
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
            await toggleCollegeFollow(collegeId);
        } catch {
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

    /* Resolves true once the server has saved the change. Callers used to
       announce success straight away, and a rejected save left the unsaved
       values on screen until a reload; now the screen is put back and the
       server's reason is shown. */
    const updateProfile = async (updates: Partial<User> & { customCollegeName?: string }): Promise<boolean> => {
        if (!user) return false;
        const previous = user;
        {
            setUser({ ...user, ...updates });
            try {
                const { updateUserProfile } = await import('@/lib/actions');
                // The server rejects any key it does not know, so send only the
                // fields a user may edit rather than the whole local User.
                const payload: Record<string, unknown> = {};
                for (const key of PROFILE_FIELDS) {
                    if (updates[key] !== undefined) payload[key] = updates[key];
                }
                const result = await updateUserProfile(payload);
                if (!result.success) {
                    setUser(previous);
                    toast.error(result.error || 'Failed to save changes');
                    return false;
                }
                return true;
            } catch (error) {
                console.error("Failed to sync profile update", error);
                setUser(previous);
                toast.error("Failed to save changes");
                return false;
            }
        }
    };

    const refreshUser = async () => {
        applyUser(await loadUser());
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
