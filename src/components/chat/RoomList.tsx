'use client';

import { useChat } from '@/context/ChatContext';
import styles from './Chat.module.css';

export default function RoomList() {
    const { rooms, activeRoomId, setActiveRoomId } = useChat();

    // Group rooms by type
    const topicRooms = rooms.filter(r => r.type === 'topic');
    const collegeRooms = rooms.filter(r => r.type === 'college');

    return (
        <div className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
                <h2 className={styles.sidebarTitle}>
                    Messages
                </h2>
            </div>

            <div className={styles.roomList}>
                <div>
                    <h3 className={styles.categoryTitle}>
                        Topic Rooms
                    </h3>
                    <div className="space-y-1">
                        {topicRooms.map(room => (
                            <RoomItem
                                key={room.id}
                                room={room}
                                isActive={room.id === activeRoomId}
                                onClick={() => setActiveRoomId(room.id)}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className={styles.categoryTitle}>
                        College Hubs
                    </h3>
                    <div className="space-y-1">
                        {collegeRooms.map(room => (
                            <RoomItem
                                key={room.id}
                                room={room}
                                isActive={room.id === activeRoomId}
                                onClick={() => setActiveRoomId(room.id)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function RoomItem({ room, isActive, onClick }: { room: any, isActive: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`${styles.roomItem} ${isActive ? styles.active : ''}`}
        >
            <div className={styles.roomIcon}>
                {room.type === 'topic' ? '#' : '🏛️'}
            </div>
            <div className={styles.roomInfo}>
                <div className={styles.roomName}>{room.name}</div>
                <div className={styles.roomParticipants}>{room.participants} Online</div>
            </div>
        </button>
    );
}
