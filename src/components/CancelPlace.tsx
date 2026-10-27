'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { cancelRegistrationAction } from '@/lib/actions/events';
import { isOk } from '@/lib/api-response';
import styles from './CancelPlace.module.css';

/**
 * Give up a place (or a spot on the waitlist). Two steps, so a stray tap
 * can't lose a seat at a full event. Paid places are not offered here: the
 * organiser cancels those and arranges the refund.
 */
export default function CancelPlace({ eventId, waitlisted }: { eventId: string; waitlisted: boolean }) {
    const router = useRouter();
    const { refreshUser } = useAuth();
    const [armed, setArmed] = useState(false);
    const [busy, setBusy] = useState(false);

    const cancel = async () => {
        setBusy(true);
        try {
            const result = await cancelRegistrationAction({ eventId });
            if (isOk(result)) {
                toast.success(waitlisted ? 'You left the waitlist.' : 'Your place is cancelled. Thanks for freeing it up.');
                await refreshUser();
                router.refresh();
                return;
            }
            toast.error(result.error || 'Could not cancel. Try again in a moment.');
        } catch {
            toast.error('Could not cancel. Try again in a moment.');
        } finally {
            setBusy(false);
            setArmed(false);
        }
    };

    if (!armed) {
        return (
            <button type="button" className={styles.quiet} onClick={() => setArmed(true)}>
                {waitlisted ? 'Leave the waitlist' : 'Cancel my place'}
            </button>
        );
    }

    return (
        <div className={styles.confirm} role="group" aria-label="Confirm cancelling">
            <p>{waitlisted ? 'Leave the waitlist?' : 'Give up your place? Someone on the waitlist may get it.'}</p>
            <div className={styles.buttons}>
                <button type="button" className={styles.danger} onClick={cancel} disabled={busy}>
                    {busy ? 'Cancelling' : waitlisted ? 'Yes, leave' : 'Yes, cancel'}
                </button>
                <button type="button" className={styles.quiet} onClick={() => setArmed(false)} disabled={busy}>
                    Keep it
                </button>
            </div>
        </div>
    );
}
