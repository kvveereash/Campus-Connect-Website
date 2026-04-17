import { Suspense } from 'react';
import ChatLayout from '@/components/chat/ChatLayout';

export default function ChatPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>Loading messages...</div>}>
            <ChatLayout />
        </Suspense>
    );
}
