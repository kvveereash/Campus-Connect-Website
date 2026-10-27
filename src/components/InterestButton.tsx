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
 * "Interested": save an event without registering. It shows up on Home and
 * My events and gets a reminder the day before. The event page is shared by
 * everyone, so whether you saved it is asked for after load.
 */
export default function InterestButton({ eventId }: { eventId: string }) {
    const { user, isLoading } = useAuth();
    const t = useT();
    const router = useRouter();
    const [saved, setSaved] = useState(false);
    const [busy, setBusy] = useState(false);
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
        if (isLoading) return;
        if (!user) {
            router.push(authHref(window.location.pathname));
            return;
        }
        setBusy(true);
        setSaved((s) => !s); // shown straight away; put back if the server says no
        const result = await toggleInterest(eventId);
        if (result.error) {
            setSaved((s) => !s);
            toast.error(result.error);
        } else if (result.interested) {
            toast.success(t('interest.savedToast'));
        }
        setBusy(false);
    };

    return (
        <button
            type="button"
            className={`btn btn-outline ${styles.button}`}
            aria-pressed={saved}
            onClick={onClick}
            disabled={busy}
        >
            {saved ? <BookmarkCheck size={16} aria-hidden="true" /> : <Bookmark size={16} aria-hidden="true" />}
            {saved ? t('interest.saved') : t('interest.interested')}
        </button>
    );
}
