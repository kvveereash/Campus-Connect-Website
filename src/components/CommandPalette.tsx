'use client';

import { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { globalSearch } from '@/lib/actions/search';
import { Search, Calendar, Users, Home, FileText, LayoutGrid, X } from 'lucide-react';
import { useCommand } from '@/context/CommandContext';

import styles from './CommandPalette.module.css';

export function CommandPalette() {
    const { isOpen, setIsOpen } = useCommand();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{
        users: { id: string; name: string; avatar: string | null }[];
        events: { id: string; title: string; date: Date; category: string }[];
        clubs: { id: string; name: string; category: string }[];
    }>({ users: [], events: [], clubs: [] });

    const router = useRouter();

    // Reset query when closed
    useEffect(() => {
        if (!isOpen) setQuery('');
    }, [isOpen]);

    const fetchResults = useDebouncedCallback(async (term: string) => {
        if (!term) {
            setResults({ users: [], events: [], clubs: [] });
            return;
        }
        const data = await globalSearch(term);
        setResults({
            users: data.users || [],
            events: data.events || [],
            clubs: data.clubs || []
        });
    }, 300);

    const handleSelect = (url: string) => {
        setIsOpen(false);
        router.push(url);
    };

    if (!isOpen) return null;

    return (
        <div
            className={styles.overlay}
            onClick={() => setIsOpen(false)}
        >
            <div
                className={styles.content}
                onClick={e => e.stopPropagation()}
            >
                <Command
                    label="Global Command Menu"
                    shouldFilter={false} // We filtering on server
                >
                    <div className={styles.header}>
                        <Search className={styles.searchIcon} />
                        <Command.Input
                            value={query}
                            onValueChange={(val) => {
                                setQuery(val);
                                fetchResults(val);
                            }}
                            placeholder="Type a command or search..."
                            className={styles.input}
                            autoFocus
                        />
                        <button onClick={() => setIsOpen(false)} className={styles.closeButton}>
                            <X size={16} />
                        </button>
                    </div>
                    <Command.List className={styles.list}>
                        {!query && results.users.length === 0 && results.events.length === 0 && (
                            <div className={styles.empty}>
                                Start typing to search...
                            </div>
                        )}

                        {query && results.users.length === 0 && results.events.length === 0 && results.clubs.length === 0 && (
                            <Command.Empty className={styles.empty}>No results found.</Command.Empty>
                        )}

                        <Command.Group heading="Pages" className={styles.groupHeading}>
                            <Command.Item onSelect={() => handleSelect('/')} className={styles.item}>
                                <Home className={styles.itemIcon} />
                                <span>Home</span>
                            </Command.Item>
                            <Command.Item onSelect={() => handleSelect('/events')} className={styles.item}>
                                <Calendar className={styles.itemIcon} />
                                <span>Events</span>
                            </Command.Item>
                            <Command.Item onSelect={() => handleSelect('/profile')} className={styles.item}>
                                <Users className={styles.itemIcon} />
                                <span>My Profile</span>
                            </Command.Item>
                        </Command.Group>

                        {results.events.length > 0 && (
                            <>
                                <div className={styles.separator} />
                                <Command.Group heading="Events" className={styles.groupHeading}>
                                    {results.events.map(event => (
                                        <Command.Item key={event.id} onSelect={() => handleSelect(`/events/${event.id}`)} className={styles.item}>
                                            <FileText className={styles.itemIcon} />
                                            <span>{event.title}</span>
                                        </Command.Item>
                                    ))}
                                </Command.Group>
                            </>
                        )}

                        {results.clubs.length > 0 && (
                            <>
                                <div className={styles.separator} />
                                <Command.Group heading="Clubs" className={styles.groupHeading}>
                                    {results.clubs.map(club => (
                                        <Command.Item key={club.id} onSelect={() => handleSelect(`/clubs/${club.id}`)} className={styles.item}>
                                            <LayoutGrid className={styles.itemIcon} />
                                            <span>{club.name}</span>
                                        </Command.Item>
                                    ))}
                                </Command.Group>
                            </>
                        )}
                        {results.users.length > 0 && (
                            <>
                                <div className={styles.separator} />
                                <Command.Group heading="Users" className={styles.groupHeading}>
                                    {results.users.map(user => (
                                        <Command.Item key={user.id} onSelect={() => handleSelect(`/profile/${user.id}`)} className={styles.item}>
                                            <Users className={styles.itemIcon} />
                                            <span>{user.name}</span>
                                        </Command.Item>
                                    ))}
                                </Command.Group>
                            </>
                        )}
                    </Command.List>
                </Command>
                <div className={styles.footer}>
                    <span>Use ↑↓ to navigate, ↵ to select</span>
                    <span>ESC to close</span>
                </div>
            </div>
        </div>
    );
}
