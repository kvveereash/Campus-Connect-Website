import { Users } from 'lucide-react';
import styles from './Chat.module.css';

/* The category colours, so a person keeps the same colour everywhere. */
const INKS = ['#2f3bff', '#e8457e', '#12a150', '#f06a00', '#7a3cff', '#0e8a96', '#c98a00', '#c2410c'];

export function inkForName(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
    return INKS[Math.abs(hash) % INKS.length];
}

interface ChatAvatarProps {
    name: string;
    src?: string | null;
    size?: number;
    group?: boolean;
}

/** A round face: the photo if there is one, else an initial on the person's colour. */
export default function ChatAvatar({ name, src, size = 44, group = false }: ChatAvatarProps) {
    return (
        <span
            className={`${styles.avatarFace} ${group ? styles.avatarGroup : ''}`}
            style={{
                width: size,
                height: size,
                fontSize: Math.round(size * 0.4),
                background: src ? 'var(--color-slate)' : group ? 'var(--color-obsidian)' : inkForName(name),
            }}
            aria-hidden="true"
        >
            {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" />
            ) : group ? (
                <Users size={Math.round(size * 0.42)} />
            ) : (
                (name.trim()[0] || '?').toUpperCase()
            )}
        </span>
    );
}
