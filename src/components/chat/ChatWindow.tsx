'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { getMessages, sendMessage, getConversationDetails, triggerTyping, markAsRead, toggleReaction, type ChatMessage, type ConversationDetails } from '@/lib/actions/chat';
import { pusherClient } from '@/lib/pusher-client';
import { chatChannel } from '@/lib/pusher-channels';
import styles from './Chat.module.css';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { ArrowLeft, Send, Paperclip, FileText, X, Image as ImageIcon, Heart, CheckCheck, Check, Search, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { GroupDetailsModal } from './GroupDetailsModal';
import { formatIST } from '@/lib/format';
import ChatAvatar, { inkForName } from './ChatAvatar';

interface ChatWindowProps {
    conversationId: string;
    onBack?: () => void;
}

/** Messages from one person less than this far apart read as one run. */
const RUN_GAP = 5 * 60 * 1000;
const dayKey = (d: string | Date) => formatIST(d, { day: 'numeric', month: 'numeric', year: 'numeric' });

/** "Today", "Yesterday", or "Mon, 12 Oct". */
function dayLabel(d: string | Date) {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 86400000);
    if (dayKey(d) === dayKey(today)) return 'Today';
    if (dayKey(d) === dayKey(yesterday)) return 'Yesterday';
    return formatIST(d, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function ChatWindow({ conversationId, onBack }: ChatWindowProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    // ChatLayout keys this component by conversation, so it starts fresh per chat.
    const [loaded, setLoaded] = useState(false);
    // The clock used for "Online": refreshed with each details poll, not read during render.
    const [now, setNow] = useState(() => Date.now());
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [attachment, setAttachment] = useState<{ url: string, type: 'image' | 'file', name: string } | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [details, setDetails] = useState<ConversationDetails | null>(null);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const fetchMessages = useCallback(async () => {
        if (!conversationId) return;
        const data = await getMessages(conversationId);
        setMessages(data);
        setLoaded(true);
    }, [conversationId]);

    // Subscribe to Pusher
    useEffect(() => {
        if (!conversationId) return;

        const channel = pusherClient.subscribe(chatChannel(conversationId));

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
        channel.bind('new-message', (data: { senderId: string }) => {
            // If I am receiver, trigger markAsRead
            if (data.senderId !== user?.id) {
                markAsRead(conversationId);
            }
            fetchMessages();
        });

        channel.bind('read-update', () => {
            fetchMessages(); // Update ticks
        });

        channel.bind('reaction-update', (data: { messageId: string; reactions: ChatMessage['reactions'] }) => {
            setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, reactions: data.reactions } : m));
        });

        // Trigger read status on join
        markAsRead(conversationId);

        return () => {
            pusherClient.unsubscribe(chatChannel(conversationId));
        };
    }, [conversationId, user?.id, fetchMessages]);

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


    useEffect(() => {
        const loadDetails = async () => {
            const data = await getConversationDetails(conversationId);
            setDetails(data);
            setNow(Date.now());
        };
        loadDetails();
        const interval = setInterval(loadDetails, 10000); // 10s poll
        return () => clearInterval(interval);
    }, [conversationId]);

    useEffect(() => {
        let alive = true;
        const poll = () =>
            getMessages(conversationId).then((data) => {
                if (!alive) return;
                setMessages(data);
                setLoaded(true);
            });
        poll();
        const interval = setInterval(poll, 3000); // Poll every 3s
        return () => {
            alive = false;
            clearInterval(interval);
        };
    }, [conversationId]);

    // Scroll to bottom when a message arrives (not on every poll).
    const lastId = messages[messages.length - 1]?.id;
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [lastId, typingUsers.length]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('That file is over 5 MB');
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
                toast.error(data.error || 'Upload failed');
            }
        } catch (err) {
            console.error(err);
            toast.error('Upload failed');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && !attachment) || sending || isUploading) return;

        setSending(true);
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

    const other = details && !details.isGroup
        ? details.participants.find((p) => p.userId !== user?.id)?.user
        : null;
    const title = details ? (details.isGroup ? details.name || 'Group chat' : other?.name || 'Chat') : '';
    const online = !!other?.lastSeenAt && now - new Date(other.lastSeenAt).getTime() < 2 * 60 * 1000;
    const status = !details
        ? 'Loading'
        : details.isGroup
            ? `${details.participants.length} members`
            : online
                ? 'Online'
                : other?.lastSeenAt
                    ? `Last seen ${dayLabel(other.lastSeenAt).toLowerCase()}, ${formatIST(other.lastSeenAt, { hour: 'numeric', minute: '2-digit' })}`
                    : 'Offline';

    const q = searchQuery.trim().toLowerCase();
    const visible = q ? messages.filter((m) => m.content?.toLowerCase().includes(q)) : messages;

    const readByAll = (m: ChatMessage) =>
        !!details &&
        details.participants
            .filter((p) => p.userId !== user?.id)
            .every((p) => new Date(p.lastReadAt) >= new Date(m.createdAt));

    return (
        <div className={styles.window}>
            <header className={styles.chatHeader}>
                {onBack && (
                    <button type="button" className={styles.backBtn} onClick={onBack} aria-label="Back to conversations">
                        <ArrowLeft size={18} aria-hidden="true" />
                    </button>
                )}
                <button type="button" className={styles.headPerson} onClick={() => setShowDetails(true)}>
                    <span className={styles.avatar}>
                        <ChatAvatar
                            name={title || '?'}
                            src={details?.isGroup ? details?.groupImage : other?.avatar}
                            size={42}
                            group={!!details?.isGroup}
                        />
                        {online && <span className={styles.onlineStatusDot} />}
                    </span>
                    <span className={styles.headText}>
                        <span className={styles.headName}>{title || ' '}</span>
                        <span className={`${styles.headStatus} ${online ? styles.statusOnline : ''}`}>{status}</span>
                    </span>
                </button>
                <div className={styles.headActions}>
                    <button
                        type="button"
                        className={`${styles.iconBtn} ${isSearchVisible ? styles.iconBtnOn : ''}`}
                        onClick={() => {
                            setIsSearchVisible((v) => !v);
                            setSearchQuery('');
                        }}
                        aria-label="Search this conversation"
                        aria-pressed={isSearchVisible}
                    >
                        <Search size={16} aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => setShowDetails(true)}
                        aria-label="Conversation details"
                    >
                        <Info size={16} aria-hidden="true" />
                    </button>
                </div>
            </header>

            {isSearchVisible && (
                <div className={styles.searchBar}>
                    <Search size={15} aria-hidden="true" />
                    <input
                        autoFocus
                        className={styles.searchInput}
                        type="search"
                        placeholder="Search in this conversation"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search in this conversation"
                    />
                    {q && <span className={styles.searchHits}>{visible.length} found</span>}
                </div>
            )}

            <div className={styles.messagesArea} ref={scrollRef}>
                {!loaded && (
                    <p className={styles.noMatches} role="status">
                        <Loader2 size={20} className={styles.spin} aria-label="Loading messages" />
                    </p>
                )}
                {loaded && messages.length === 0 && (
                    <div className={styles.noMatches} style={{ textAlign: 'center' }}>
                        <p className={styles.emptyTitle} style={{ fontSize: 22 }}>Say hello.</p>
                        <p className={styles.emptyText}>
                            This is the start of your conversation{title ? ` with ${title}` : ''}.
                        </p>
                    </div>
                )}
                {q && visible.length === 0 && (
                    <p className={styles.noMatches}>No messages match &ldquo;{searchQuery}&rdquo;.</p>
                )}
                {visible.map((m, i) => {
                    const isMe = m.senderId === user?.id;
                    const prev = visible[i - 1];
                    const next = visible[i + 1];
                    const at = new Date(m.createdAt).getTime();
                    const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
                    const joinsPrev = !!prev && !newDay && prev.senderId === m.senderId &&
                        at - new Date(prev.createdAt).getTime() < RUN_GAP;
                    const joinsNext = !!next && next.senderId === m.senderId &&
                        dayKey(next.createdAt) === dayKey(m.createdAt) &&
                        new Date(next.createdAt).getTime() - at < RUN_GAP;
                    const rowClass = [
                        styles.messageRow,
                        isMe ? styles.rowMe : styles.rowOther,
                        joinsPrev ? '' : styles.rowStart,
                        joinsNext ? '' : styles.rowEnd,
                    ].join(' ');
                    const senderName = m.sender?.name || 'Someone';
                    const read = isMe && readByAll(m);

                    return (
                        <div key={m.id} style={{ display: 'contents' }}>
                            {newDay && <div className={styles.dayDivider}>{dayLabel(m.createdAt)}</div>}
                            <div className={rowClass}>
                                {!isMe && (
                                    <div className={styles.msgAvatar}>
                                        {!joinsNext && <ChatAvatar name={senderName} src={m.sender?.avatar} size={30} />}
                                    </div>
                                )}
                                <div className={styles.msgStack}>
                                    {!isMe && details?.isGroup && !joinsPrev && (
                                        <span className={styles.senderName} style={{ color: inkForName(senderName) }}>
                                            {senderName}
                                        </span>
                                    )}
                                    <div className={`${styles.bubble} ${isMe ? styles.bubbleMe : styles.bubbleOther}`}>
                                        {m.attachmentUrl && (
                                            <div className={styles.attachmentPreview}>
                                                {m.attachmentType === 'image' ? (
                                                    <div className={styles.attachmentImage}>
                                                        <Image src={m.attachmentUrl} alt="Attachment" fill sizes="240px" />
                                                    </div>
                                                ) : (
                                                    <a
                                                        href={m.attachmentUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={styles.fileAttachment}
                                                    >
                                                        <FileText size={18} aria-hidden="true" />
                                                        <span>{m.content === 'Sent a file' ? 'Download file' : 'Attachment'}</span>
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                        {m.content && <p>{m.content}</p>}

                                        <div className={styles.msgFooter}>
                                            <span className={styles.msgTime}>
                                                {formatIST(m.createdAt, { hour: 'numeric', minute: '2-digit' })}
                                            </span>
                                            {isMe && (
                                                <span
                                                    className={`${styles.readStatus} ${read ? styles.readDone : ''}`}
                                                    aria-label={read ? 'Read' : 'Sent'}
                                                >
                                                    {read ? <CheckCheck size={14} /> : <Check size={14} />}
                                                </span>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            className={styles.addReactionBtn}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleReaction(m.id, '❤️');
                                            }}
                                            aria-label="React with a heart"
                                        >
                                            <Heart size={14} aria-hidden="true" />
                                        </button>
                                    </div>

                                    {m.reactions?.length > 0 && (
                                        <div className={styles.reactionRow}>
                                            {m.reactions.map((r) => (
                                                <span key={r.id} className={styles.reactionItem}>{r.emoji}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {typingUsers.length > 0 && (
                    <div className={styles.typingIndicator} aria-label="Typing">
                        <span />
                        <span />
                        <span />
                    </div>
                )}
            </div>

            <form className={styles.inputArea} onSubmit={handleSend}>
                <input type="file" ref={fileInputRef} hidden onChange={handleFileSelect} />

                <button
                    type="button"
                    className={styles.attachBtn}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    aria-label="Attach a file"
                >
                    {isUploading ? (
                        <Loader2 size={20} className={styles.spin} aria-hidden="true" />
                    ) : (
                        <Paperclip size={20} aria-hidden="true" />
                    )}
                </button>

                <div className={styles.composer}>
                    {attachment && (
                        <div className={styles.attachmentChip}>
                            <span className={styles.chipName}>
                                {attachment.type === 'image' ? (
                                    <ImageIcon size={14} aria-hidden="true" />
                                ) : (
                                    <FileText size={14} aria-hidden="true" />
                                )}
                                {attachment.name}
                            </span>
                            <button
                                type="button"
                                className={styles.chipRemove}
                                onClick={() => setAttachment(null)}
                                aria-label="Remove attachment"
                            >
                                <X size={14} aria-hidden="true" />
                            </button>
                        </div>
                    )}
                    <input
                        type="text"
                        value={input}
                        onChange={handleInput}
                        placeholder={title ? `Message ${details?.isGroup ? title : title.split(' ')[0]}` : 'Write a message'}
                        className={styles.chatInput}
                        aria-label="Message"
                    />
                </div>

                <button
                    type="submit"
                    disabled={sending || isUploading || (!input.trim() && !attachment)}
                    className={styles.sendBtn}
                    aria-label="Send"
                >
                    {sending ? (
                        <Loader2 size={18} className={styles.spin} aria-hidden="true" />
                    ) : (
                        <Send size={18} aria-hidden="true" />
                    )}
                </button>
            </form>
            {showDetails && <GroupDetailsModal conversationId={conversationId} onClose={() => setShowDetails(false)} />}
        </div>
    );
}
