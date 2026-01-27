'use client';

import { useEffect, useState, useRef } from 'react';
import { getMessages, sendMessage, getConversationDetails, triggerTyping, markAsRead, toggleReaction } from '@/lib/actions/chat';
import { pusherClient } from '@/lib/pusher';
import styles from './Chat.module.css';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { Send, Paperclip, FileText, X, Image as ImageIcon, Smile, CheckCheck, Check, Search } from 'lucide-react';
import { toast } from 'sonner';

import { GroupDetailsModal } from './GroupDetailsModal';

interface ChatWindowProps {
    conversationId: string;
    onBack?: () => void;
}

export function ChatWindow({ conversationId, onBack }: ChatWindowProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [attachment, setAttachment] = useState<{ url: string, type: 'image' | 'file', name: string } | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [details, setDetails] = useState<any>(null);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Subscribe to Pusher
    useEffect(() => {
        if (!conversationId) return;

        const channel = pusherClient.subscribe(`chat-${conversationId}`);

        channel.bind('typing', (data: { userId: string }) => {
            if (data.userId !== user?.id) {
                setTypingUsers(prev => prev.includes(data.userId) ? prev : [...prev, data.userId]);

                // Clear after 3s
                setTimeout(() => {
                    setTypingUsers(prev => prev.filter(id => id !== data.userId));
                }, 3000);
            }
        });

        // Also bind to new-message to instant update
        channel.bind('new-message', (data: any) => {
            // If I am the sender, I already have it via optimistic UI (or fetch), but for now fetch is easiest
            // If I am receiver, trigger markAsRead
            if (data.senderId !== user?.id) {
                markAsRead(conversationId);
            }
            fetchMessages();
        });

        channel.bind('read-update', () => {
            fetchMessages(); // Update ticks
        });

        channel.bind('reaction-update', (data: any) => {
            setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, reactions: data.reactions } : m));
        });

        // Trigger read status on join
        markAsRead(conversationId);

        return () => {
            pusherClient.unsubscribe(`chat-${conversationId}`);
        };
    }, [conversationId, user?.id]);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);

        // Debounce trigger
        if (!typingTimeoutRef.current) {
            triggerTyping(conversationId);
            typingTimeoutRef.current = setTimeout(() => {
                typingTimeoutRef.current = null;
            }, 2000); // Only trigger every 2s max
        }
    };

    const fetchMessages = async () => {
        if (!conversationId) return;
        const data = await getMessages(conversationId);
        setMessages(data);
    };

    useEffect(() => {
        const loadDetails = async () => {
            const data = await getConversationDetails(conversationId);
            setDetails(data);
        };
        loadDetails();
        const interval = setInterval(loadDetails, 10000); // 10s poll
        return () => clearInterval(interval);
    }, [conversationId]);

    useEffect(() => {
        setMessages([]); // clear on switch
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000); // Poll every 3s
        return () => clearInterval(interval);
    }, [conversationId]);

    // Scroll to bottom on updates
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert('File too large (Max 5MB)');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                const type = file.type.startsWith('image/') ? 'image' : 'file';
                setAttachment({ url: data.url, type, name: file.name });
            } else {
                alert('Upload failed: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Upload failed');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && !attachment) || sending || isUploading) return;

        setSending(true);
        // Optimistic UI could be added here
        const result = await sendMessage(conversationId, input, attachment?.url, attachment?.type);
        if (result.success) {
            setInput('');
            setAttachment(null);
            fetchMessages(); // Immediate refresh
        } else {
            toast.error(result.error || 'Failed to send message');
        }
        setSending(false);
    };

    return (
        <div className={styles.window}>
            <div className={styles.chatHeader}>
                {onBack && <button className={styles.backBtn} onClick={onBack}>←</button>}
                <div
                    style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                    onClick={() => setShowDetails(true)}
                    title="View Details"
                >
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {details?.isGroup ? (details.name || 'Group Chat') : (
                            details?.participants?.find((p: any) => p.userId !== user?.id)?.user.name || 'Chat'
                        )}
                        <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>ⓘ</span>
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: '#a1a1aa', fontWeight: 500 }}>
                        {details ? (
                            details.isGroup ? `${details.participants.length} members` : (
                                (() => {
                                    const other = details.participants.find((p: any) => p.userId !== user?.id)?.user;
                                    if (!other?.lastSeenAt) return 'Offline';
                                    const diff = new Date().getTime() - new Date(other.lastSeenAt).getTime();
                                    return diff < 2 * 60 * 1000 ? 'Online' : `Last seen ${new Date(other.lastSeenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                                })()
                            )
                        ) : 'Click for Info'}
                    </span>
                </div>
            </div>

            <div className={styles.messagesArea} ref={scrollRef}>
                {messages
                    .filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((m, i) => {
                        const isMe = m.senderId === user?.id;
                        return (
                            <div key={m.id} className={`${styles.messageRow} ${isMe ? styles.rowMe : styles.rowOther}`}>
                                {!isMe && (
                                    <div className={styles.msgAvatar}>
                                        {m.sender?.avatar ? (
                                            <Image src={m.sender.avatar} width={28} height={28} alt="" style={{ borderRadius: '50%' }} />
                                        ) : (
                                            <div className={styles.tinyAvatar}>{m.sender?.name?.[0]}</div>
                                        )}
                                    </div>
                                )}
                                <div className={`${styles.bubble} ${isMe ? styles.bubbleMe : styles.bubbleOther}`} style={{ position: 'relative' }}>
                                    {m.attachmentUrl && (
                                        <div className={styles.attachmentPreview}>
                                            {m.attachmentType === 'image' ? (
                                                <div style={{ position: 'relative', width: '200px', height: '150px', marginBottom: '8px' }}>
                                                    <Image src={m.attachmentUrl} alt="Attachment" fill style={{ objectFit: 'cover', borderRadius: '8px' }} />
                                                </div>
                                            ) : (
                                                <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className={styles.fileAttachment}>
                                                    <FileText size={20} />
                                                    <span>{m.content === 'Sent a file' ? 'Download File' : 'Attachment'}</span>
                                                </a>
                                            )}
                                        </div>
                                    )}
                                    <p>{m.content}</p>

                                    <div className={styles.msgFooter}>
                                        <span className={styles.msgTime}>
                                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {isMe && (
                                            <div className={styles.readStatus}>
                                                {/* Logic: if details.participants all read > createdAt */}
                                                {(() => {
                                                    if (!details) return <Check size={14} />;
                                                    // Basic check: if everyone else has readAt > message.createdAt
                                                    const everyoneRead = details.participants
                                                        .filter((p: any) => p.userId !== user?.id)
                                                        .every((p: any) => new Date(p.lastReadAt) > new Date(m.createdAt));

                                                    return everyoneRead ? <CheckCheck size={14} color="#60a5fa" /> : <CheckCheck size={14} color="#71717a" />;
                                                })()}
                                            </div>
                                        )}
                                    </div>

                                    {/* Reactions Display */}
                                    {m.reactions?.length > 0 && (
                                        <div className={styles.reactionRow}>
                                            {m.reactions.map((r: any) => (
                                                <span key={r.id} className={styles.reactionItem}>{r.emoji}</span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Reaction Button (Hover) */}
                                    <button
                                        className={styles.addReactionBtn}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleReaction(m.id, '❤️'); // Default heart for MVP
                                        }}
                                    >
                                        <Smile size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                {typingUsers.length > 0 && (
                    <div className={styles.typingIndicator}>
                        <span className={styles.typingDots}>typing...</span>
                    </div>
                )}
            </div>

            <form className={styles.inputArea} onSubmit={handleSend}>
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} />

                <button type="button" className={styles.attachBtn} onClick={() => fileInputRef.current?.click()} disabled={isUploading} title="Attach File">
                    {isUploading ? <span style={{ fontSize: '0.6rem', color: 'white' }}>...</span> : <Paperclip size={20} />}
                </button>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {attachment && (
                        <div className={styles.attachmentChip}>
                            <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {attachment.type === 'image' ? <ImageIcon size={14} /> : <FileText size={14} />}
                                {attachment.name}
                            </span>
                            <button type="button" onClick={() => setAttachment(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={14} /></button>
                        </div>
                    )}
                    <input
                        type="text"
                        value={input}
                        onChange={handleInput}
                        placeholder="Type a message..."
                        className={styles.chatInput}
                        style={{ width: '100%' }}
                    />
                </div>

                <button type="submit" disabled={sending || isUploading || (!input.trim() && !attachment)} className={styles.sendBtn}>
                    {sending ? '...' : <Send size={20} />}
                </button>
            </form>
            {showDetails && <GroupDetailsModal conversationId={conversationId} onClose={() => setShowDetails(false)} />}
        </div>
    );
}
