'use client';

import { useEffect, useState } from 'react';
import { getConversationDetails, addMemberToGroup, leaveGroup, searchUsers } from '@/lib/actions/chat';
import styles from './Chat.module.css';
import Image from 'next/image';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Search, Shield, UserPlus, LogOut } from 'lucide-react';

interface GroupDetailsModalProps {
    conversationId: string;
    onClose: () => void;
}

export function GroupDetailsModal({ conversationId, onClose }: GroupDetailsModalProps) {
    const { user: currentUser } = useAuth();
    const router = useRouter();
    const [details, setDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Add Member State
    const [isAdding, setIsAdding] = useState(false);
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);

    useEffect(() => {
        loadDetails();
    }, [conversationId]);

    const loadDetails = async () => {
        setLoading(true);
        const data = await getConversationDetails(conversationId);
        setDetails(data);
        setLoading(false);
    };

    const handleSearch = async (val: string) => {
        setQuery(val);
        if (val.length >= 2) {
            const users = await searchUsers(val);
            // Filter out existing members
            const currentMemberIds = details?.participants.map((p: any) => p.userId) || [];
            const filtered = users.filter((u: any) => !currentMemberIds.includes(u.id));
            setSearchResults(filtered);
        } else {
            setSearchResults([]);
        }
    };

    const handleAddMember = async (userId: string) => {
        const result = await addMemberToGroup(conversationId, userId);
        if (result.success) {
            toast.success('Member added');
            setQuery('');
            setSearchResults([]);
            setIsAdding(false);
            loadDetails(); // Refresh list
        } else {
            toast.error(result.error);
        }
    };

    const handleLeave = async () => {
        if (!confirm('Are you sure you want to leave this group?')) return;

        const result = await leaveGroup(conversationId);
        if (result.success) {
            toast.success('You left the group');
            router.push('/messages'); // Go to list
            onClose();
        } else {
            toast.error(result.error);
        }
    };

    if (loading) return null; // Or spinner
    if (!details) return null;

    const myRole = details.participants.find((p: any) => p.userId === currentUser?.id)?.role;
    const isAdmin = myRole === 'ADMIN';

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h3>Group Info</h3>
                    <button className={styles.closeBtn} onClick={onClose}>×</button>
                </div>

                <div className={styles.groupHeaderInfo}>
                    <div className={styles.groupAvatarLarge}>
                        {details.isGroup ? '👥' : '👤'}
                    </div>
                    <div>
                        <h2 className={styles.groupTitle}>{details.name || 'Group Chat'}</h2>
                        <span className={styles.memberCount}>{details.participants.length} members</span>
                    </div>
                </div>

                <div className={styles.sectionHeader}>
                    <h4>Members</h4>
                    {isAdmin && (
                        <button
                            className={styles.iconBtn}
                            onClick={() => setIsAdding(!isAdding)}
                            title="Add Member"
                        >
                            <UserPlus size={18} />
                        </button>
                    )}
                </div>

                {isAdding && (
                    <div className={styles.addMemberBox}>
                        <div className={styles.inputWrapper}>
                            <Search size={16} className={styles.searchIcon} />
                            <input
                                className={styles.miniInput}
                                placeholder="Search users..."
                                value={query}
                                onChange={e => handleSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                        {searchResults.length > 0 && (
                            <div className={styles.miniResults}>
                                {searchResults.map(u => (
                                    <div key={u.id} className={styles.miniResultItem} onClick={() => handleAddMember(u.id)}>
                                        <div className={styles.tinyAvatar}>{u.name[0]}</div>
                                        <span>{u.name}</span>
                                        <span className={styles.plusIcon}>+</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className={styles.memberList}>
                    {details.participants.map((p: any) => (
                        <div key={p.id} className={styles.memberItem}>
                            <div className={styles.memberInfo}>
                                <div className={styles.tinyAvatar}>
                                    {p.user.avatar ? (
                                        <Image src={p.user.avatar} width={32} height={32} alt="" style={{ borderRadius: '50%' }} />
                                    ) : (
                                        p.user.name[0]
                                    )}
                                </div>
                                <span className={styles.memberName}>
                                    {p.user.name}
                                    {p.userId === currentUser?.id && ' (You)'}
                                </span>
                            </div>
                            {p.role === 'ADMIN' && (
                                <span className={styles.adminBadge}><Shield size={12} /> Admin</span>
                            )}
                        </div>
                    ))}
                </div>

                <div className={styles.footerActions}>
                    <button className={styles.dangerBtn} onClick={handleLeave}>
                        <LogOut size={16} /> Leave Group
                    </button>
                </div>
            </div>
        </div>
    );
}
