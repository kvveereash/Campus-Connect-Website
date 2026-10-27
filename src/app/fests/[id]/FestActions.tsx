'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Bookmark, BookmarkCheck, PencilLine } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { getFestSaveProgress, saveWholeFest, viewerCanManageFest } from '@/lib/actions/fests';
import { authHref } from '@/lib/utils';
import styles from './page.module.css';

/**
 * The per-person part of a fest page: save every upcoming event in it at
 * once, and, for its organisers, a way to the edit page. The page itself is
 * shared by everyone, so both are asked for after load.
 */
export default function FestActions({ festId, upcomingCount }: { festId: string; upcomingCount: number }) {
    const { user, isLoading } = useAuth();
    const signedIn = Boolean(user);
    const [progress, setProgress] = useState<{ saved: number; total: number } | null>(null);
    const [canManage, setCanManage] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!signedIn) return;
        let live = true;
        Promise.all([getFestSaveProgress(festId), viewerCanManageFest(festId)])
            .then(([p, manage]) => {
                if (!live) return;
                setProgress(p);
                setCanManage(manage);
            })
            .catch(() => {});
        return () => {
            live = false;
        };
    }, [festId, signedIn]);

    const total = progress?.total ?? 0;
    const allSaved = progress !== null && total > 0 && progress.saved >= total;

    const onSave = async () => {
        setBusy(true);
        const result = await saveWholeFest(festId);
        setBusy(false);
        if (!result.success) {
            toast.error(`That did not save: ${result.error}`);
            return;
        }
        const { added } = result.data;
        setProgress({ saved: result.data.total, total: result.data.total });
        toast.success(
            added === 0
                ? 'You had already saved every event in this fest.'
                : `Saved ${added} ${added === 1 ? 'event' : 'events'}. They are on your home page, each with a reminder the day before.`
        );
    };

    let save: ReactNode = null;
    if (upcomingCount > 0) {
        if (isLoading) {
            // Until we know who is looking, the button holds its place.
            save = (
                <button type="button" className={styles.saveButton} disabled>
                    <Bookmark size={16} aria-hidden="true" />
                    Save the whole fest
                </button>
            );
        } else if (!signedIn) {
            save = (
                <Link href={authHref(`/fests/${festId}`)} className={styles.saveButton}>
                    <Bookmark size={16} aria-hidden="true" />
                    Sign in to save the whole fest
                </Link>
            );
        } else if (allSaved) {
            save = (
                <span className={`${styles.saveButton} ${styles.saveDone}`} role="status">
                    <BookmarkCheck size={16} aria-hidden="true" />
                    All {total} upcoming {total === 1 ? 'event' : 'events'} saved
                </span>
            );
        } else {
            save = (
                <button type="button" className={styles.saveButton} onClick={onSave} disabled={busy}>
                    <Bookmark size={16} aria-hidden="true" />
                    {busy ? 'Saving' : 'Save the whole fest'}
                </button>
            );
        }
    }

    return (
        <>
            {save}
            {upcomingCount > 0 && (
                <span className={styles.saveHint}>
                    {progress && progress.saved > 0 && !allSaved
                        ? `${progress.saved} of ${progress.total} saved so far`
                        : `${upcomingCount} upcoming ${upcomingCount === 1 ? 'event' : 'events'}, each with a reminder`}
                </span>
            )}
            {canManage && (
                <Link href={`/fests/${festId}/edit`} className={styles.manageLink}>
                    <PencilLine size={14} aria-hidden="true" />
                    Edit fest
                </Link>
            )}
        </>
    );
}
