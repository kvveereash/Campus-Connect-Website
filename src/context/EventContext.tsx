'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Event } from '@/types';
import { EVENTS } from '@/lib/data';

interface EventContextType {
    events: Event[];
    isLoading: boolean;
    addEvent: (eventData: Omit<Event, 'id' | 'registrationCount'>) => void;
    updateEvent: (id: string, eventData: Partial<Omit<Event, 'id'>>) => void;
    deleteEvent: (id: string) => void;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ children }: { children: React.ReactNode }) {
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Load events from local storage or fallback to mock data
        const savedEvents = localStorage.getItem('events');

        // Simulate a clearer loading state for demo purposes
        setTimeout(() => {
            if (savedEvents) {
                setEvents(JSON.parse(savedEvents));
            } else {
                setEvents(EVENTS);
            }
            setIsLoading(false);
        }, 800);

    }, []);

    const addEvent = (eventData: Omit<Event, 'id' | 'registrationCount'>) => {
        const newEvent: Event = {
            ...eventData,
            id: `e${Date.now()}`, // Simple ID generation
            registrationCount: 0,
        };

        const updatedEvents = [...events, newEvent];
        setEvents(updatedEvents);
        localStorage.setItem('events', JSON.stringify(updatedEvents));
    };

    const updateEvent = (id: string, eventData: Partial<Omit<Event, 'id'>>) => {
        const updatedEvents = events.map(event =>
            event.id === id ? { ...event, ...eventData } : event
        );
        setEvents(updatedEvents);
        localStorage.setItem('events', JSON.stringify(updatedEvents));
    };

    const deleteEvent = (id: string) => {
        const updatedEvents = events.filter(event => event.id !== id);
        setEvents(updatedEvents);
        localStorage.setItem('events', JSON.stringify(updatedEvents));
    };

    return (
        <EventContext.Provider value={{ events, isLoading, addEvent, updateEvent, deleteEvent }}>
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
