import ChatLayout from '@/components/chat/ChatLayout';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Messages | Campus Connect',
    description: 'Direct Messages',
};

import { Suspense } from 'react';

export default function MessagesPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>Loading messages...</div>}>
            <ChatLayout />
        </Suspense>
    );
}
