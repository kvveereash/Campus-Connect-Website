'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteClub } from '@/lib/actions';
import { toast } from 'sonner';
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
    const [armed, setArmed] = useState(false);
    useEffect(() => {
        if (!armed) return;
        const id = setTimeout(() => setArmed(false), 3000);
        return () => clearTimeout(id);
    }, [armed]);

    const handleDelete = async () => {
        if (!armed) {
            setArmed(true);
            return;
        }
        setArmed(false);
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
                onBlur={() => setArmed(false)}
                disabled={isDeleting}
                aria-busy={isDeleting}
            >
                {isDeleting ? 'Deleting' : armed ? 'Press again to delete' : 'Delete club'}
            </button>
            <p className={styles.note}>Removes the club, its members and its posts. This cannot be undone.</p>
        </div>
    );
}
