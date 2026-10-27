'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    addVolunteerRoleAction,
    removeVolunteerRoleAction,
    updateVolunteerRoleAction,
    type OrganiserVolunteerRole,
} from '@/lib/actions/volunteers';
import { ROLE_DESCRIPTION_MAX, ROLE_NAME_MAX, ROLE_SLOTS_MAX } from './limits';
import styles from './VolunteerManager.module.css';

const FAILED = 'Could not save that. Try again in a moment.';
const people = (n: number) => (n === 1 ? '1 person' : `${n} people`);

/** The slots field's text as a whole number, or null while it is not one. */
function readSlots(value: string) {
    const n = Number(value);
    return Number.isInteger(n) && n >= 1 && n <= ROLE_SLOTS_MAX ? n : null;
}

/**
 * The organiser's side of volunteering, on the attendee page: the roles the
 * event needs, who has signed up for each, and a form to add another. The
 * server checks every change; this only arranges them.
 */
export default function VolunteerManager({ eventId, roles }: { eventId: string; roles: OrganiserVolunteerRole[] }) {
    const nameRef = useRef<HTMLInputElement>(null);

    return (
        <div className={styles.manager}>
            {roles.length === 0 ? (
                <div className={styles.empty}>
                    <h2>No volunteer roles yet</h2>
                    <p>Add the jobs you need people for, such as Registration desk or Stage, and students can sign up from the event page.</p>
                    <button type="button" className="btn btn-outline" onClick={() => nameRef.current?.focus()}>
                        Add the first role
                    </button>
                </div>
            ) : (
                <ul className={styles.roles}>
                    {roles.map((role) => (
                        <RoleCard key={role.id} role={role} />
                    ))}
                </ul>
            )}
            <AddRoleForm eventId={eventId} nameRef={nameRef} />
        </div>
    );
}

function AddRoleForm({ eventId, nameRef }: { eventId: string; nameRef: React.RefObject<HTMLInputElement | null> }) {
    const router = useRouter();
    const [name, setName] = useState('');
    const [slots, setSlots] = useState('4');
    const [description, setDescription] = useState('');
    const [busy, setBusy] = useState(false);
    const count = readSlots(slots);

    const add = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || count === null) return;
        setBusy(true);
        try {
            const result = await addVolunteerRoleAction({ eventId, name, slots: count, description: description || undefined });
            if (result.success) {
                toast.success(`Added ${name.trim()}. Students can sign up from the event page.`);
                setName('');
                setDescription('');
                router.refresh();
            } else {
                toast.error(result.error || FAILED);
            }
        } catch {
            toast.error(FAILED);
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={add} className={styles.form} aria-label="Add a volunteer role">
            <p className={styles.formLabel}>Add a role</p>
            <div className={styles.fields}>
                <label className={styles.field}>
                    <span>Role</span>
                    <input
                        ref={nameRef}
                        value={name}
                        maxLength={ROLE_NAME_MAX}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Registration desk"
                        className={styles.input}
                        required
                    />
                </label>
                <label className={styles.field}>
                    <span>People needed</span>
                    <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={ROLE_SLOTS_MAX}
                        value={slots}
                        onChange={(e) => setSlots(e.target.value)}
                        className={styles.input}
                        required
                    />
                </label>
            </div>
            <label className={styles.field}>
                <span>What they will do (optional)</span>
                <input
                    value={description}
                    maxLength={ROLE_DESCRIPTION_MAX}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Check tickets and hand out ID cards from 9 am"
                    className={styles.input}
                />
            </label>
            <div className={styles.formFoot}>
                <span className={styles.hint}>The role is printed on the certificate of everyone who does it.</span>
                <button type="submit" className="btn btn-primary" disabled={busy || !name.trim() || count === null}>
                    {busy ? 'Adding' : 'Add role'}
                </button>
            </div>
        </form>
    );
}

function RoleCard({ role }: { role: OrganiserVolunteerRole }) {
    const router = useRouter();
    const [editing, setEditing] = useState(false);
    const [armed, setArmed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [name, setName] = useState(role.name);
    const [slots, setSlots] = useState(String(role.slots));
    const count = readSlots(slots);
    const tooFew = count !== null && count < role.taken;

    const run = async (work: () => Promise<{ success: boolean; error?: string }>, done: string) => {
        setBusy(true);
        try {
            const result = await work();
            if (result.success) {
                toast.success(done);
                setEditing(false);
                setArmed(false);
                router.refresh();
            } else {
                toast.error(result.error || FAILED);
            }
        } catch {
            toast.error(FAILED);
        } finally {
            setBusy(false);
        }
    };

    const save = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || count === null || tooFew) return;
        void run(() => updateVolunteerRoleAction({ roleId: role.id, name, slots: count }), 'Saved.');
    };

    // From the latest props: a refresh after someone signs up changes them.
    const startEditing = () => {
        setName(role.name);
        setSlots(String(role.slots));
        setEditing(true);
    };

    const remove = () =>
        run(
            () => removeVolunteerRoleAction({ roleId: role.id }),
            role.taken > 0 ? `Removed ${role.name} and told ${people(role.taken)}.` : `Removed ${role.name}.`,
        );

    return (
        <li className={styles.role}>
            {editing ? (
                <form onSubmit={save} className={styles.edit} aria-label={`Edit ${role.name}`}>
                    <div className={styles.fields}>
                        <label className={styles.field}>
                            <span>Role</span>
                            <input
                                value={name}
                                maxLength={ROLE_NAME_MAX}
                                onChange={(e) => setName(e.target.value)}
                                className={styles.input}
                                required
                            />
                        </label>
                        <label className={styles.field}>
                            <span>People needed</span>
                            <input
                                type="number"
                                inputMode="numeric"
                                min={Math.max(1, role.taken)}
                                max={ROLE_SLOTS_MAX}
                                value={slots}
                                onChange={(e) => setSlots(e.target.value)}
                                className={styles.input}
                                aria-describedby={`slots-${role.id}`}
                                required
                            />
                        </label>
                    </div>
                    <div className={styles.formFoot}>
                        <span id={`slots-${role.id}`} className={styles.hint} data-warn={tooFew || undefined}>
                            {role.taken > 0
                                ? `${people(role.taken)} signed up, so at least ${role.taken}.`
                                : `Up to ${ROLE_SLOTS_MAX}.`}
                        </span>
                        <span className={styles.buttons}>
                            <button type="button" className={styles.quiet} onClick={() => setEditing(false)} disabled={busy}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={busy || !name.trim() || count === null || tooFew}>
                                {busy ? 'Saving' : 'Save'}
                            </button>
                        </span>
                    </div>
                </form>
            ) : (
                <div className={styles.roleHead}>
                    <div className={styles.roleTitle}>
                        <h2>{role.name}</h2>
                        <span className={styles.count} data-full={role.taken >= role.slots || undefined}>
                            {role.taken} of {role.slots} signed up
                        </span>
                        {role.description && <p>{role.description}</p>}
                    </div>
                    <span className={styles.buttons}>
                        {armed ? (
                            <>
                                <button type="button" className={styles.quiet} onClick={() => setArmed(false)} disabled={busy}>
                                    Keep it
                                </button>
                                <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>
                                    {busy ? 'Removing' : role.taken > 0 ? `Remove and tell ${people(role.taken)}` : 'Remove role'}
                                </button>
                            </>
                        ) : (
                            <>
                                <button type="button" className={styles.quiet} onClick={startEditing}>
                                    Edit
                                </button>
                                <button type="button" className={styles.quiet} onClick={() => setArmed(true)}>
                                    Remove
                                </button>
                            </>
                        )}
                    </span>
                </div>
            )}

            {role.volunteers.length === 0 ? (
                <p className={styles.none}>No one has signed up yet.</p>
            ) : (
                <ul className={styles.people}>
                    {role.volunteers.map((v) => (
                        <li key={v.id}>
                            <Link href={`/profile/${v.id}`} className={styles.person}>
                                <span className={styles.avatar}>
                                    {v.avatar ? <Image src={v.avatar} alt="" width={28} height={28} sizes="28px" /> : v.name.charAt(0).toUpperCase()}
                                </span>
                                <span className={styles.personName}>{v.name}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </li>
    );
}
