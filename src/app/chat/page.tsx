import ChatLayout from '@/components/chat/ChatLayout';
import RoomList from '@/components/chat/RoomList';
import ChatWindow from '@/components/chat/ChatWindow';

export default function ChatPage() {
    return (
        <ChatLayout>
            <RoomList />
            <ChatWindow />
        </ChatLayout>
    );
}
