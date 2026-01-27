'use client';

import { ChatProvider } from '@/context/ChatContext';

export default function ChatRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ChatProvider>
            {children}
        </ChatProvider>
    );
}
