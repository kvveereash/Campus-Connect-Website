'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import Pusher from 'pusher-js';
import { ChatMessage, ChatRoom } from '@/types';
import { useAuth } from './AuthContext';
import { getConversations, getMessages, sendMessage as sendServerMessage } from '@/lib/actions/chat';

interface ChatContextType {
    rooms: ChatRoom[];
    activeRoomId: string | null;
    setActiveRoomId: (id: string) => void;
    messages: Record<string, ChatMessage[]>;
    sendMessage: (content: string) => void;
    isLoading: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
    const [isLoading, setIsLoading] = useState(true);

    // Polling ref to clear interval on unmount/change
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    // 1. Fetch Rooms on Mount
    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const fetchedConversations = await getConversations();
                const mappedRooms: ChatRoom[] = fetchedConversations.map((c: any) => ({
                    id: c.id,
                    name: c.otherUser?.name || 'Unknown',
                    type: 'private',
                    participants: 2,
                    description: c.lastMessage
                }));
                setRooms(mappedRooms);
                if (mappedRooms.length > 0 && !activeRoomId) {
                    setActiveRoomId(mappedRooms[0].id);
                }
            } catch (error) {
                console.error('Failed to load rooms:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRooms();
    }, []);

    // 2. Real-time Subscription (Pusher)
    useEffect(() => {
        if (!activeRoomId) return;

        // Initial Fetch
        const fetchRoomMessages = async () => {
            try {
                const fetchedMessages = await getMessages(activeRoomId);
                const processedMessages = fetchedMessages.map((msg: any) => ({
                    id: msg.id,
                    roomId: msg.conversationId,
                    senderId: msg.senderId,
                    senderName: msg.sender.name,
                    senderAvatar: msg.sender.avatar,
                    content: msg.content,
                    timestamp: new Date(msg.createdAt).toISOString(),
                    isMe: user ? msg.senderId === user.id : false
                }));

                setMessages(prev => ({
                    ...prev,
                    [activeRoomId]: processedMessages as ChatMessage[]
                }));
            } catch (error) {
                console.error('Error fetching messages:', error);
            }
        };

        fetchRoomMessages();
        const interval = setInterval(fetchRoomMessages, 3000);

        return () => {
            clearInterval(interval);
        };
    }, [activeRoomId, user]);

    const sendMessage = async (content: string) => {
        if (!activeRoomId || !user) return;

        // Optimistic Update
        const tempId = Date.now().toString();
        const optimisticMessage: ChatMessage = {
            id: tempId,
            roomId: activeRoomId,
            senderId: user.id,
            senderName: user.name,
            content,
            timestamp: new Date().toISOString(),
            isMe: true
        };

        setMessages(prev => ({
            ...prev,
            [activeRoomId]: [...(prev[activeRoomId] || []), optimisticMessage]
        }));

        try {
            const result = await sendServerMessage(activeRoomId, content);
            if (!result.success) {
                // Revert if failed (simple remove for now)
                setMessages(prev => ({
                    ...prev,
                    [activeRoomId]: prev[activeRoomId].filter(m => m.id !== tempId)
                }));
                alert('Failed to send message');
            } else {
                // Replace temp ID with real one if needed, or let polling sync it
                // For simplicity, we just look for polling to catch up, 
                // but strictly we could update the ID here.
            }
        } catch (error) {
            console.error('Send error:', error);
        }
    };

    return (
        <ChatContext.Provider value={{ rooms, activeRoomId, setActiveRoomId, messages, sendMessage, isLoading }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
}
