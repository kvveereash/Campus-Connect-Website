'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { addCoOrganiserAction, removeCoOrganiserAction } from '@/lib/actions/organiser';
import styles from '../organiser.module.css';

/** Make an attendee a co-organiser, or take that back. Creator only (the server checks). */
export default function OrganiserButton({ eventId, userId, name, mode }: { eventId: string; userId: string; name: string; mode: 'add' | 'remove' }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    const run = async () => {
        setBusy(true);
        try {
            const result =
                mode === 'add' ? await addCoOrganiserAction({ eventId, userId }) : await removeCoOrganiserAction({ eventId, userId });
            if (result.success) {
                toast.success(mode === 'add' ? `${name} can now check people in.` : `${name} is no longer an organiser.`);
                router.refresh();
            } else {
                toast.error(result.error || 'Could not change that. Try again in a moment.');
            }
        } catch {
            toast.error('Could not change that. Try again in a moment.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <button type="button" className={styles.quiet} onClick={run} disabled={busy}>
            {busy ? 'Saving' : mode === 'add' ? 'Make organiser' : 'Remove'}
        </button>
    );
}
