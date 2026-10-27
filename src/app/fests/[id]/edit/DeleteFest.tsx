'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { deleteFest } from '@/lib/actions/fests';
import styles from '../../manage.module.css';

export default function DeleteFest({ festId, festName }: { festId: string; festName: string }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    const onDelete = async () => {
        if (!confirm(`Take ${festName} down? Its events stay listed on their own.`)) return;
        setBusy(true);
        const result = await deleteFest(festId);
        if (!result.success) {
            setBusy(false);
            toast.error(`The fest is still up: ${result.error}`);
            return;
        }
        toast.success(`${festName} is off the board.`);
        router.push('/fests');
    };

    return (
        <button type="button" className={styles.removeButton} onClick={onDelete} disabled={busy}>
            {busy ? 'Taking it down' : 'Take the fest down'}
        </button>
    );
}
