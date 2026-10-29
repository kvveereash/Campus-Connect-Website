'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Check, Link2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { SITE_URL } from '@/lib/site';
import { withRef } from '@/components/analytics/sources';
import styles from './ShareButton.module.css';

const noSubscribe = () => () => {};
const canNativeShare = () => typeof navigator.share === 'function';

/**
 * Share an event. Students pass events on in group chats, so on a phone this
 * opens the system share sheet (WhatsApp is usually first). Where there is no
 * share sheet (most desktops) it offers WhatsApp and Copy link instead.
 *
 * Each link carries ?ref=, so the organiser's numbers can tell a WhatsApp
 * share from a copied link (see src/components/analytics/ViewBeacon.tsx).
 */
export default function ShareButton({ title, text, path }: { title: string; text: string; path: string }) {
    // false during server render and hydration; the real answer after.
    const native = useSyncExternalStore(noSubscribe, canNativeShare, () => false);
    // "Copied" shows in the button itself for two seconds, where the eye
    // already is, instead of in a toast across the screen.
    const [copied, setCopied] = useState(false);
    useEffect(() => {
        if (!copied) return;
        const id = setTimeout(() => setCopied(false), 2000);
        return () => clearTimeout(id);
    }, [copied]);
    const url = () => new URL(withRef(path, 'share'), window.location.origin).toString();

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
            setCopied(true);
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
                href={`https://wa.me/?text=${encodeURIComponent(`${text} ${SITE_URL}${withRef(path, 'whatsapp')}`)}`}
                target="_blank"
                rel="noopener noreferrer"
            >
                <Share2 size={16} aria-hidden="true" />
                WhatsApp
            </a>
            <button type="button" className={`btn btn-outline ${styles.button}`} onClick={copy}>
                {copied ? (
                    <Check size={16} className={styles.pop} aria-hidden="true" />
                ) : (
                    <Link2 size={16} aria-hidden="true" />
                )}
                {copied ? 'Copied' : 'Copy link'}
            </button>
            <span className={styles.srOnly} aria-live="polite">
                {copied ? 'Link copied' : ''}
            </span>
        </div>
    );
}
