'use client';

import { useSyncExternalStore } from 'react';
import { Link2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { SITE_URL } from '@/lib/site';
import styles from './ShareButton.module.css';

const noSubscribe = () => () => {};
const canNativeShare = () => typeof navigator.share === 'function';

/**
 * Share an event. Students pass events on in group chats, so on a phone this
 * opens the system share sheet (WhatsApp is usually first). Where there is no
 * share sheet (most desktops) it offers WhatsApp and Copy link instead.
 */
export default function ShareButton({ title, text, path }: { title: string; text: string; path: string }) {
    // false during server render and hydration; the real answer after.
    const native = useSyncExternalStore(noSubscribe, canNativeShare, () => false);
    const url = () => new URL(path, window.location.origin).toString();

    const share = async () => {
        try {
            await navigator.share({ title, text, url: url() });
        } catch {
            // Closing the share sheet rejects; nothing to report.
        }
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url());
            toast.success('Link copied');
        } catch {
            toast.error('Could not copy the link. Copy it from the address bar instead.');
        }
    };

    if (native) {
        return (
            <button type="button" className={`btn btn-outline ${styles.button}`} onClick={share}>
                <Share2 size={16} aria-hidden="true" />
                Share
            </button>
        );
    }

    return (
        <div className={styles.row}>
            <a
                className={`btn btn-outline ${styles.button}`}
                href={`https://wa.me/?text=${encodeURIComponent(`${text} ${SITE_URL}${path}`)}`}
                target="_blank"
                rel="noopener noreferrer"
            >
                <Share2 size={16} aria-hidden="true" />
                WhatsApp
            </a>
            <button type="button" className={`btn btn-outline ${styles.button}`} onClick={copy}>
                <Link2 size={16} aria-hidden="true" />
                Copy link
            </button>
        </div>
    );
}
