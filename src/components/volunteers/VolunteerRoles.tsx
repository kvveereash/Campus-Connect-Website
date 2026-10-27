'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/lib/i18n';
import { authHref } from '@/lib/utils';
import {
    getEventVolunteering,
    volunteerForRoleAction,
    withdrawFromRoleAction,
    type EventVolunteering,
} from '@/lib/actions/volunteers';
import styles from './VolunteerRoles.module.css';


/**
 * "Help run it": the volunteer roles an organiser listed, with the slots
 * left on each and a button to take one. Fetched in the browser, because the
 * event page is the same for everyone and this part is not. Shows nothing
 * until there are roles, so the page does not change for most events.
 */
export default function VolunteerRoles({ eventId, isPast }: { eventId: string; isPast: boolean }) {
    const pathname = usePathname();
    const { user } = useAuth();
    const t = useT();
    const slotsLeft = (n: number) => (n === 1 ? t('vol.slotLeft') : t('vol.slotsLeft', { n }));
    const userId = user?.id ?? null;
    const [data, setData] = useState<EventVolunteering | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setData(await getEventVolunteering(eventId));
        } catch {
            // Keeps what is on screen; the buttons still report their own errors.
        }
    }, [eventId]);

    // Again when someone signs in or out, so the buttons match who is looking.
    useEffect(() => {
        let live = true;
        getEventVolunteering(eventId)
            .then((d) => live && setData(d))
            .catch(() => {});
        return () => {
            live = false;
        };
    }, [eventId, userId]);

    if (!data || data.roles.length === 0) return null;

    const mine = data.roles.find((r) => r.id === data.myRoleId) ?? null;
    const open = !isPast && data.verified;

    const act = async (roleId: string, roleName: string, mode: 'join' | 'leave') => {
        setBusy(roleId);
        try {
            const result = mode === 'join' ? await volunteerForRoleAction({ roleId }) : await withdrawFromRoleAction({ roleId });
            if (result.success) {
                toast.success(
                    mode === 'join'
                        ? t('vol.downAs', { role: roleName })
                        : t('vol.withdrew', { role: roleName }),
                );
            } else {
                toast.error(result.error || t('vol.failed'));
            }
        } catch {
            toast.error(t('vol.failed'));
        } finally {
            // Fresh counts either way: a refusal usually means someone else got there first.
            await load();
            setBusy(null);
        }
    };

    let note: string;
    if (isPast) note = mine ? t('vol.pastMine', { role: mine.name }) : t('vol.closed');
    else if (!data.verified) note = t('vol.unapproved');
    else if (mine) note = t('vol.mine', { role: mine.name });
    else note = t('vol.pickOne');

    return (
        <section className={styles.section} aria-labelledby="volunteer-heading">
            <p className={styles.label}>{t('vol.label')}</p>
            <h2 id="volunteer-heading" className={styles.title}>
                {t('vol.titleBefore')}
                <em className="accent">{t('vol.titleAccent')}</em>
            </h2>
            <p className={styles.note}>{note}</p>

            <ul className={styles.roles}>
                {data.roles.map((role) => {
                    const left = Math.max(0, role.slots - role.taken);
                    const isMine = role.id === data.myRoleId;
                    const full = left === 0 && !isMine;
                    return (
                        <li key={role.id} className={styles.role} data-mine={isMine || undefined}>
                            <div className={styles.roleHead}>
                                <h3 id={`role-${role.id}`} className={styles.roleName}>
                                    {role.name}
                                </h3>
                                {isMine && <span className={styles.badge}>{isPast ? t('vol.youDid') : t('vol.you')}</span>}
                            </div>
                            {role.description && <p className={styles.roleText}>{role.description}</p>}
                            <div className={styles.meter} aria-hidden="true">
                                <span style={{ width: `${Math.min(100, (role.taken / role.slots) * 100)}%` }} />
                            </div>
                            <div className={styles.roleFoot}>
                                <span className={styles.count}>
                                    {full ? t('vol.full') : slotsLeft(left)}
                                    <small> · {t('vol.ofSlots', { taken: role.taken, slots: role.slots })}</small>
                                </span>
                                {open &&
                                    (!data.signedIn ? (
                                        <Link href={authHref(pathname)} className="btn btn-outline">
                                            {t('vol.signIn')}
                                        </Link>
                                    ) : isMine ? (
                                        <button
                                            type="button"
                                            className="btn btn-outline"
                                            disabled={busy !== null}
                                            onClick={() => act(role.id, role.name, 'leave')}
                                            aria-describedby={`role-${role.id}`}
                                        >
                                            {busy === role.id ? t('vol.withdrawing') : t('vol.withdraw')}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            disabled={busy !== null || full || mine !== null}
                                            onClick={() => act(role.id, role.name, 'join')}
                                            aria-describedby={`role-${role.id}`}
                                        >
                                            {busy === role.id ? t('vol.saving') : full ? t('vol.full') : t('vol.volunteer')}
                                        </button>
                                    ))}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
