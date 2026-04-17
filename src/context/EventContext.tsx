'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Event } from '@/types';
import { getAllEvents } from '@/lib/actions/events';

interface EventContextType {
    events: Event[];
    isLoading: boolean;
    refreshEvents: () => Promise<void>;
    addEvent: (eventData: Omit<Event, 'id' | 'registrationCount'>) => void;
    updateEvent: (id: string, eventData: Partial<Omit<Event, 'id'>>) => void;
    deleteEvent: (id: string) => void;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ children }: { children: React.ReactNode }) {
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        try {
            const dbEvents = await getAllEvents();
            // Map database events to the Event type format
            const mapped = dbEvents.map((e: any) => ({
                id: e.id,
                title: e.title,
                description: e.description,
                date: e.date instanceof Date ? e.date.toISOString() : e.date,
                venue: e.venue,
                hostCollegeId: e.hostCollegeId,
                category: e.category,
                registrationCount: e._count?.registrations ?? e.registrationCount ?? 0,
                price: e.price ?? 0,
                thumbnail: e.thumbnail || '/event-placeholder.png',
                creatorId: e.creatorId,
                clubId: e.clubId,
                hostCollege: e.hostCollege,
                club: e.club,
            }));
            setEvents(mapped);
        } catch (error) {
            console.error('Failed to fetch events:', error);
            setEvents([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const refreshEvents = useCallback(async () => {
        await fetchEvents();
    }, [fetchEvents]);

    // Optimistic updates — update local state immediately, then refresh from DB
    const addEvent = (eventData: Omit<Event, 'id' | 'registrationCount'>) => {
        // After server action creates event, just refresh
        fetchEvents();
    };

    const updateEvent = (id: string, eventData: Partial<Omit<Event, 'id'>>) => {
        setEvents(prev => prev.map(event =>
            event.id === id ? { ...event, ...eventData } : event
        ));
        fetchEvents();
    };

    const deleteEvent = (id: string) => {
        setEvents(prev => prev.filter(event => event.id !== id));
        fetchEvents();
    };

    return (
        <EventContext.Provider value={{ events, isLoading, refreshEvents, addEvent, updateEvent, deleteEvent }}>
            {children}
        </EventContext.Provider>
    );
}

export function useEvents() {
    const context = useContext(EventContext);
    if (context === undefined) {
        throw new Error('useEvents must be used within an EventProvider');
    }
    return context;
}
