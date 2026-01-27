'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface CommandContextType {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    toggle: () => void;
}

const CommandContext = createContext<CommandContextType | undefined>(undefined);

export function CommandProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    const toggle = () => setIsOpen(prev => !prev);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen((open) => !open);
            }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    return (
        <CommandContext.Provider value={{ isOpen, setIsOpen, toggle }}>
            {children}
        </CommandContext.Provider>
    );
}

export function useCommand() {
    const context = useContext(CommandContext);
    if (context === undefined) {
        throw new Error('useCommand must be used within a CommandProvider');
    }
    return context;
}
