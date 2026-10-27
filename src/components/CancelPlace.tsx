'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { cancelRegistrationAction } from '@/lib/actions/events';
import { isOk } from '@/lib/api-response';
import { useT } from '@/lib/i18n';
import styles from './CancelPlace.module.css';

/**
 * Give up a place (or a spot on the waitlist). Two steps, so a stray tap
 * can't lose a seat at a full event. Paid places are not offered here: the
 * organiser cancels those and arranges the refund.
 */
export default function CancelPlace({ eventId, waitlisted }: { eventId: string; waitlisted: boolean }) {
    const router = useRouter();
    const { refreshUser } = useAuth();
    const t = useT();
    const [armed, setArmed] = useState(false);
    const [busy, setBusy] = useState(false);

    const cancel = async () => {
        setBusy(true);
        try {
            const result = await cancelRegistrationAction({ eventId });
            if (isOk(result)) {
                toast.success(waitlisted ? t('cancel.leftToast') : t('cancel.cancelledToast'));
                await refreshUser();
                router.refresh();
                return;
            }
            toast.error(result.error || t('cancel.failed'));
        } catch {
            toast.error(t('cancel.failed'));
        } finally {
            setBusy(false);
            setArmed(false);
        }
    };

    if (!armed) {
        return (
            <button type="button" className={styles.quiet} onClick={() => setArmed(true)}>
                {waitlisted ? t('cancel.leaveWaitlist') : t('cancel.cancelPlace')}
            </button>
        );
    }

    return (
        <div className={styles.confirm} role="group" aria-label="Confirm cancelling">
            <p>{waitlisted ? t('cancel.confirmLeave') : t('cancel.confirmCancel')}</p>
            <div className={styles.buttons}>
                <button type="button" className={styles.danger} onClick={cancel} disabled={busy}>
                    {busy ? t('cancel.cancelling') : waitlisted ? t('cancel.yesLeave') : t('cancel.yesCancel')}
                </button>
                <button type="button" className={styles.quiet} onClick={() => setArmed(false)} disabled={busy}>
                    {t('cancel.keep')}
                </button>
            </div>
        </div>
    );
}
