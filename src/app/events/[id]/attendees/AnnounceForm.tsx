'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { announceToAttendeesAction } from '@/lib/actions/organiser';
import { isOk } from '@/lib/api-response';
import styles from '../organiser.module.css';

const MAX = 500;

/** "Venue moved to Hall 3": one message to everyone going and waiting. */
export default function AnnounceForm({ eventId, audience }: { eventId: string; audience: number }) {
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    const send = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;
        setBusy(true);
        try {
            const result = await announceToAttendeesAction({ eventId, message });
            if (isOk(result)) {
                toast.success(result.data.sent === 1 ? 'Sent to 1 person.' : `Sent to ${result.data.sent} people.`);
                setMessage('');
            } else {
                toast.error(result.error || 'Could not send it. Try again in a moment.');
            }
        } catch {
            toast.error('Could not send it. Try again in a moment.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={send} className={styles.announce}>
            <label htmlFor="announcement" className={styles.announceLabel}>
                Tell everyone going{audience > 0 ? ` (${audience})` : ''}
            </label>
            <textarea
                id="announcement"
                value={message}
                maxLength={MAX}
                rows={3}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Venue moved to Seminar Hall 3. Doors open at 6."
                className={styles.announceInput}
            />
            <div className={styles.announceFoot}>
                <span className={styles.announceCount}>
                    {message.length}/{MAX} · arrives as a notification, and on phones that turned them on
                </span>
                <button type="submit" className="btn btn-primary" disabled={busy || !message.trim() || audience === 0}>
                    {busy ? 'Sending' : 'Send update'}
                </button>
            </div>
        </form>
    );
}
