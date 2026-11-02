'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteClub } from '@/lib/actions';
import { toast } from 'sonner';
import { usePressAgain } from '@/components/usePressAgain';
import styles from './ClubAdminControls.module.css';

interface ClubAdminControlsProps {
    clubId: string;
}

export default function ClubAdminControls({ clubId }: ClubAdminControlsProps) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    // Deleting asks twice, in place, like Leave club: the first press turns
    // the button into "Press again to delete" for three seconds.
    // window.confirm() used to ask, which reads as a browser error.
    const { armed, confirm, disarm } = usePressAgain();

    const handleDelete = async () => {
        if (!confirm()) return;
        setIsDeleting(true);
        try {
            const result = await deleteClub(clubId);
            if (result.success) {
                toast.success('Club deleted.');
                router.push('/clubs');
            } else {
                toast.error(result.error || 'Could not delete the club. Try again in a moment.');
                setIsDeleting(false);
            }
        } catch {
            toast.error('Could not reach the server. Try again in a moment.');
            setIsDeleting(false);
        }
    };

    return (
        <div className={styles.controls}>
            <p className={styles.label}>Admin controls</p>
            <button
                type="button"
                className={`btn btn-danger ${styles.delete}`}
                data-armed={armed}
                onClick={handleDelete}
                onBlur={disarm}
                disabled={isDeleting}
                aria-busy={isDeleting}
            >
                {isDeleting ? 'Deleting' : armed ? 'Press again to delete' : 'Delete club'}
            </button>
            <span className="sr-only" aria-live="polite">
                {armed ? 'Press again to delete the club.' : ''}
            </span>
            <p className={styles.note}>Removes the club, its members and its posts. This cannot be undone.</p>
        </div>
    );
}
