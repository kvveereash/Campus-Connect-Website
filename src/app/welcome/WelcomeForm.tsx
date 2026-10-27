'use client';

import { useState } from 'react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateUserProfile } from '@/lib/actions/auth';
import { safeRedirectPath } from '@/lib/utils';
import styles from './page.module.css';

const OTHER = 'other';
const MAX_INTERESTS = 8;

type College = { id: string; name: string; location: string };

export default function WelcomeForm({
    firstName,
    colleges,
    interests,
    currentCollegeId,
    currentInterests,
    next,
}: {
    firstName: string;
    colleges: College[];
    interests: string[];
    currentCollegeId: string;
    currentInterests: string[];
    next: string | null;
}) {
    const [collegeId, setCollegeId] = useState(currentCollegeId);
    const [customCollege, setCustomCollege] = useState('');
    const [picked, setPicked] = useState<string[]>(currentInterests);
    const [saving, setSaving] = useState(false);

    // Where they were going before sign-up (an event, usually), else home.
    const go = () => window.location.assign(safeRedirectPath(next, window.location.origin, '/'));

    const toggle = (name: string) =>
        setPicked((p) =>
            p.includes(name) ? p.filter((n) => n !== name) : p.length >= MAX_INTERESTS ? p : [...p, name],
        );

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const college =
            collegeId === OTHER
                ? { collegeId: OTHER, customCollegeName: customCollege.trim() }
                : collegeId && collegeId !== currentCollegeId
                  ? { collegeId }
                  : {};
        const result = await updateUserProfile({ ...college, interests: picked });
        if (result.success) {
            go();
        } else {
            toast.error(result.error || 'Could not save that. Try again, or skip for now.');
            setSaving(false);
        }
    };

    const canSave = collegeId !== OTHER || customCollege.trim().length >= 3;

    return (
        <main className={styles.page}>
            <form className={styles.card} onSubmit={save}>
                <p className="mono-label">Welcome, {firstName}</p>
                <h1 className={styles.title}>
                    Two things, then <em className="accent">you&rsquo;re in.</em>
                </h1>
                <p className={styles.lede}>
                    So the board opens on your campus and what you are into. Change either any time on your
                    profile.
                </p>

                <fieldset className={styles.step}>
                    <legend className={styles.legend}>Your college</legend>
                    <div className={styles.selectWrap}>
                        <select
                            className={styles.select}
                            value={collegeId}
                            onChange={(e) => setCollegeId(e.target.value)}
                            aria-label="Your college"
                        >
                            <option value="">Choose your college</option>
                            {colleges.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                    {c.location ? ` — ${c.location.split(',')[0]}` : ''}
                                </option>
                            ))}
                            <option value={OTHER}>Not listed: add mine</option>
                        </select>
                        <ChevronDown size={16} className={styles.chevron} aria-hidden="true" />
                    </div>
                    {collegeId === OTHER && (
                        <input
                            className={styles.input}
                            value={customCollege}
                            onChange={(e) => setCustomCollege(e.target.value)}
                            placeholder="Full name of your college"
                            aria-label="Full name of your college"
                            maxLength={100}
                            autoFocus
                        />
                    )}
                </fieldset>

                {interests.length > 0 && (
                    <fieldset className={styles.step}>
                        <legend className={styles.legend}>
                            What you are into <span className={styles.hint}>up to {MAX_INTERESTS}</span>
                        </legend>
                        <div className={styles.chips}>
                            {interests.map((name) => {
                                const on = picked.includes(name);
                                return (
                                    <button
                                        key={name}
                                        type="button"
                                        className={styles.chip}
                                        aria-pressed={on}
                                        onClick={() => toggle(name)}
                                        disabled={!on && picked.length >= MAX_INTERESTS}
                                    >
                                        {on && <Check size={14} aria-hidden="true" />}
                                        {name}
                                    </button>
                                );
                            })}
                        </div>
                    </fieldset>
                )}

                <div className={styles.actions}>
                    <button type="submit" className="btn btn-primary" disabled={saving || !canSave}>
                        {saving && <Loader2 size={15} className={styles.spin} aria-hidden="true" />}
                        {saving ? 'Saving' : 'Save and continue'}
                    </button>
                    <button type="button" className={styles.skip} onClick={go} disabled={saving}>
                        Skip for now
                    </button>
                </div>
            </form>
        </main>
    );
}
