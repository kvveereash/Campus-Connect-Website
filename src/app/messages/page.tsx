import ChatLayout from '@/components/chat/ChatLayout';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Messages | Campus Connect',
    description: 'Direct Messages',
};

export default function MessagesPage() {
    return <ChatLayout />;
}
