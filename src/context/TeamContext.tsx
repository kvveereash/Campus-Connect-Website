'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { TeamRequest } from '@/types';

interface TeamContextType {
    requests: TeamRequest[];
    addRequest: (requestData: Omit<TeamRequest, 'id' | 'createdAt'>) => Promise<{ success: boolean; error?: string }>;
    deleteRequest: (id: string) => Promise<{ success: boolean; error?: string }>;
    updateRequest: (id: string, updates: Partial<TeamRequest>) => Promise<{ success: boolean; error?: string }>;
    getRequestsByEvent: (eventId: string) => TeamRequest[];
    fetchRequests: (eventId: string) => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: React.ReactNode }) {
    const [requestsMap, setRequestsMap] = useState<Record<string, TeamRequest[]>>({});

    // Dynamically import actions to avoid client-side build issues if actions aren't ready
    const getActions = async () => {
        return await import('@/lib/actions/team');
    };

    const fetchRequests = React.useCallback(async (eventId: string) => {
        try {
            const { getTeamRequestsByEvent } = await getActions();
            const fetched = await getTeamRequestsByEvent(eventId);
            setRequestsMap(prev => ({ ...prev, [eventId]: fetched }));
        } catch (error) {
            console.error("Failed to fetch requests", error);
        }
    }, []);

    const addRequest = React.useCallback(async (requestData: Omit<TeamRequest, 'id' | 'createdAt'>) => {
        try {
            const { createTeamRequest } = await getActions();
            const result = await createTeamRequest({
                eventId: requestData.eventId,
                type: requestData.type,
                skills: requestData.skills,
                description: requestData.description
            });

            if (result.success) {
                await fetchRequests(requestData.eventId);
                return { success: true };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error("Failed to add request", error);
            return { success: false, error: "Unexpected error occurred" };
        }
    }, [fetchRequests]);

    const updateRequest = React.useCallback(async (id: string, updates: Partial<TeamRequest>) => {
        try {
            const { updateTeamRequest } = await getActions();
            // We need eventId to refresh, but updates might not have it.
            // For now, we refresh all or we need to find the eventId from current state.
            // NOTE: referencing state in useCallback requires adding it to deps, which might re-trigger.
            // Better to pass eventId or fetch fresh.
            // Using functional state update or ref is better, but here we read directly.
            // For simplicity, we can trust the caller to refresh or we can iterate.
            // Issue: requestsMap is stale inside useCallback if not in deps.
            // FIX: Don't read state here if possible, or accept re-creation. 
            // BUT: If we put requestsMap in deps, we cycle again if state updates!
            // Solution: Just ignore the optimized partial refresh or fetch everything?
            // Actually, we can just fetchRequests if we knew the eventId.
            // The logic below tries to find eventID from stale map.
            // Let's rely on the server validation mainly, and maybe just return success.
            // Or better: Let's accept that updateRequest might change reference when requestsMap changes.
            // However, TeamFinder depends on updateRequest? Not in the effect. Only fetchRequests is in the effect.
            // So updateRequest changing is fine!

            const eventId = Object.keys(requestsMap).find(eid => requestsMap[eid].some(r => r.id === id));

            const result = await updateTeamRequest(id, {
                type: updates.type,
                skills: updates.skills,
                description: updates.description
            });

            if (result.success) {
                if (eventId) await fetchRequests(eventId);
                return { success: true };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error("Failed to update request", error);
            return { success: false, error: "Unexpected error occurred" };
        }
    }, [requestsMap, fetchRequests]);

    const deleteRequest = React.useCallback(async (id: string) => {
        try {
            const { deleteTeamRequest } = await getActions();
            const eventId = Object.keys(requestsMap).find(eid => requestsMap[eid].some(r => r.id === id));

            const result = await deleteTeamRequest(id);

            if (result.success) {
                if (eventId) await fetchRequests(eventId);
                return { success: true };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error("Failed to delete request", error);
            return { success: false, error: "Unexpected error occurred" };
        }
    }, [requestsMap, fetchRequests]);

    const getRequestsByEvent = React.useCallback((eventId: string) => {
        return requestsMap[eventId] || [];
    }, [requestsMap]);

    return (
        <TeamContext.Provider value={{ requests: [], addRequest, deleteRequest, updateRequest, getRequestsByEvent, fetchRequests }}>
            {children}
        </TeamContext.Provider>
    );
}

export function useTeam() {
    const context = useContext(TeamContext);
    if (context === undefined) {
        throw new Error('useTeam must be used within a TeamProvider');
    }
    return context;
}
