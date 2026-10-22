import type { User } from '@/types';
import styles from './ProfileCompleteness.module.css';

/* In the order they are worth asking for: each says why. */
const STEPS: { done: (u: User) => boolean; ask: string }[] = [
    { done: (u) => Boolean(u.collegeId), ask: 'Add your college to see what is on there first.' },
    { done: (u) => (u.skills?.length ?? 0) > 0, ask: 'Add your skills so teams looking for them can find you.' },
    { done: (u) => (u.interests?.length ?? 0) > 0, ask: 'Add what you are into, for better event picks.' },
    { done: (u) => Boolean(u.avatar), ask: 'Add a photo so people recognise you at events.' },
    { done: (u) => Boolean(u.bio?.trim()), ask: 'Write a line about yourself.' },
    { done: (u) => Boolean(u.department && u.year), ask: 'Add your department and year.' },
];

/**
 * How complete your own profile is, and the one thing most worth adding
 * next. Gone once everything is filled in.
 */
export default function ProfileCompleteness({ user, onEdit }: { user: User; onEdit: () => void }) {
    const done = STEPS.filter((s) => s.done(user)).length;
    const next = STEPS.find((s) => !s.done(user));
    if (!next) return null;
    const percent = Math.round((done / STEPS.length) * 100);

    return (
        <section className={styles.card} aria-label="Profile completeness">
            <div className={styles.head}>
                <p className={styles.title}>Your profile is {percent}% done</p>
                <button type="button" className="btn btn-primary" onClick={onEdit}>
                    Add it
                </button>
            </div>
            <div
                className={styles.bar}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                aria-label="Profile completeness"
            >
                <span style={{ width: `${percent}%` }} />
            </div>
            <p className={styles.next}>{next.ask}</p>
        </section>
    );
}
