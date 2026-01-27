'use client';

import { useState } from 'react';
import { searchUsers, createGroupConversation } from '@/lib/actions/chat';
import styles from './Chat.module.css';
import Image from 'next/image';
import { toast } from 'sonner';

interface CreateGroupModalProps {
    onClose: () => void;
    onGroupCreated: (id: string) => void;
}

export function CreateGroupModal({ onClose, onGroupCreated }: CreateGroupModalProps) {
    const [name, setName] = useState('');
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
    const [creating, setCreating] = useState(false);

    const handleSearch = async (val: string) => {
        setQuery(val);
        if (val.length >= 2) {
            const users = await searchUsers(val);
            setSearchResults(users);
        } else {
            setSearchResults([]);
        }
    };

    const toggleUser = (user: any) => {
        if (selectedUsers.some(u => u.id === user.id)) {
            setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
        } else {
            setSelectedUsers(prev => [...prev, user]);
            setQuery('');
            setSearchResults([]);
        }
    };

    const handleCreate = async () => {
        if (!name.trim() || selectedUsers.length === 0) return;

        setCreating(true);
        const result = await createGroupConversation(name, selectedUsers.map(u => u.id));

        if (result.success && result.data) {
            toast.success('Group created!');
            onGroupCreated(result.data);
            onClose();
        } else {
            toast.error(result.error || 'Failed to create group');
        }
        setCreating(false);
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h3>Create New Group</h3>
                    <button className={styles.closeBtn} onClick={onClose}>×</button>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Group Name</label>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="e.g., Marketing Team"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Add Members</label>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="Search users..."
                        value={query}
                        onChange={e => handleSearch(e.target.value)}
                    />

                    {/* Selected Users Pills */}
                    <div className={styles.selectedUsers}>
                        {selectedUsers.map(u => (
                            <div key={u.id} className={styles.selectedApi}>
                                {u.name}
                                <span className={styles.removeUser} onClick={() => toggleUser(u)}>×</span>
                            </div>
                        ))}
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                        <div className={styles.searchResults}>
                            {searchResults.map(user => {
                                const isSelected = selectedUsers.some(u => u.id === user.id);
                                if (isSelected) return null;

                                return (
                                    <div key={user.id} className={styles.searchItem} onClick={() => toggleUser(user)}>
                                        <div className={styles.tinyAvatar}>
                                            {user.avatar ? (
                                                <Image src={user.avatar} width={24} height={24} alt="" style={{ borderRadius: '50%' }} />
                                            ) : (
                                                user.name[0]
                                            )}
                                        </div>
                                        <span>{user.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <button
                    className={styles.primaryBtn}
                    disabled={!name.trim() || selectedUsers.length === 0 || creating}
                    onClick={handleCreate}
                >
                    {creating ? 'Creating...' : 'Create Group'}
                </button>
            </div>
        </div>
    );
}
