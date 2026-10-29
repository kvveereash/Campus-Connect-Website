'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/lib/i18n';
import { isInterested, toggleInterest } from '@/lib/actions/interest';
import { authHref } from '@/lib/utils';
import styles from './ShareButton.module.css';

/**
 * "Interested": save an event without registering. It shows up in My events
 * and gets a reminder the day before. The event page is shared by
 * everyone, so whether you saved it is asked for after load.
 */
export default function InterestButton({ eventId }: { eventId: string }) {
    const { user, isLoading } = useAuth();
    const t = useT();
    const router = useRouter();
    const [saved, setSaved] = useState(false);
    const [busy, setBusy] = useState(false);
    // Only a tap pops the tick: a saved state found on load just shows.
    const [tapped, setTapped] = useState(false);
    const signedIn = Boolean(user);

    useEffect(() => {
        if (!signedIn) return;
        let live = true;
        isInterested(eventId)
            .then((s) => live && setSaved(s))
            .catch(() => {});
        return () => {
            live = false;
        };
    }, [eventId, signedIn]);

    const onClick = async () => {
        // The new state shows at once, so the button stays at full strength
        // while the server answers; a second tap meanwhile is ignored.
        if (isLoading || busy) return;
        if (!user) {
            router.push(authHref(window.location.pathname));
            return;
        }
        setBusy(true);
        setTapped(true);
        setSaved((s) => !s); // shown straight away; put back if the server says no
        try {
            const result = await toggleInterest(eventId);
            if (result.error) {
                setSaved((s) => !s);
                toast.error(result.error);
            } else if (result.interested) {
                toast.success(t('interest.savedToast'));
            }
        } catch {
            setSaved((s) => !s);
            toast.error(t('interest.failed'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            className={`btn btn-outline ${styles.button}`}
            aria-pressed={saved}
            onClick={onClick}
        >
            {saved ? (
                <BookmarkCheck size={16} className={tapped ? styles.pop : undefined} aria-hidden="true" />
            ) : (
                <Bookmark size={16} aria-hidden="true" />
            )}
            {saved ? t('interest.saved') : t('interest.interested')}
        </button>
    );
}
