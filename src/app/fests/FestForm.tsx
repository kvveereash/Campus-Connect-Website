'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import ImageUpload from '@/components/ImageUpload';
import { createFest, updateFest } from '@/lib/actions/fests';
import { FEST_LIMITS, checkFestDates, istDateKey } from './rules';
import type { FestHosts } from './access';
import styles from './form.module.css';

export interface FestFormValues {
    name: string;
    tagline: string;
    description: string;
    /** 'YYYY-MM-DD', an IST calendar day. */
    startDate: string;
    endDate: string;
    coverImage: string;
}

type Props =
    | { mode: 'create'; hosts: FestHosts }
    | { mode: 'edit'; festId: string; initial: FestFormValues; hostLine: string };

const EMPTY: FestFormValues = { name: '', tagline: '', description: '', startDate: '', endDate: '', coverImage: '' };

/** Adds whole days to a 'YYYY-MM-DD' key, for the end date's max. */
function addDays(key: string, days: number) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * Start and edit a fest. The server checks everything again; checking the
 * dates here too means the common mistakes are caught before a round trip.
 */
export default function FestForm(props: Props) {
    const router = useRouter();
    const isNew = props.mode === 'create';
    const [values, setValues] = useState<FestFormValues>(isNew ? EMPTY : props.initial);
    const [host, setHost] = useState(() => {
        if (props.mode !== 'create') return '';
        const firstClub = props.hosts.clubs[0];
        return firstClub ? `club:${firstClub.id}` : '';
    });
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const set = (key: keyof FestFormValues) => (e: { target: { value: string } }) => {
        setValues((v) => ({ ...v, [key]: e.target.value }));
        setError(null);
    };

    const today = istDateKey(new Date());
    const dateError =
        values.startDate && values.endDate ? checkFestDates(values.startDate, values.endDate, { isNew }) : null;

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const problem = checkFestDates(values.startDate, values.endDate, { isNew });
        if (problem) {
            setError(problem);
            return;
        }

        setBusy(true);
        setError(null);
        const fields = {
            name: values.name,
            tagline: values.tagline,
            description: values.description,
            startDate: values.startDate,
            endDate: values.endDate,
            coverImage: values.coverImage,
        };

        try {
            if (props.mode === 'create') {
                const [kind, id] = host.split(':');
                const result = await createFest({
                    ...fields,
                    clubId: kind === 'club' ? id : undefined,
                    collegeId: kind === 'college' ? id : undefined,
                });
                if (!result.success) {
                    setError(result.error);
                    return;
                }
                if (result.data.verified) {
                    toast.success('The fest is on the board.');
                    router.push(`/fests/${result.data.id}`);
                } else {
                    toast.success('Sent for approval. Add its events while you wait.');
                    router.push(`/fests/${result.data.id}/edit`);
                }
            } else {
                const result = await updateFest(props.festId, fields);
                if (!result.success) {
                    setError(result.error);
                    return;
                }
                toast.success(
                    result.data.backToQueue
                        ? 'Saved. The fest is off the board until an admin approves the changes.'
                        : 'Saved.'
                );
                router.refresh();
            }
        } catch {
            setError('Could not reach the server. Check your connection and try again.');
        } finally {
            setBusy(false);
        }
    };

    const hosts = props.mode === 'create' ? props.hosts : null;
    const showHostPicker = hosts !== null && (hosts.clubs.length > 1 || (hosts.colleges?.length ?? 0) > 0);
    // Only a site admin is offered colleges, and their fest needs no approval.
    const goesLiveAtOnce = hosts?.colleges != null;

    return (
        <form className={styles.form} onSubmit={onSubmit} noValidate>
            {props.mode === 'edit' && <p className={styles.hostLine}>{props.hostLine}</p>}
            {hosts && !showHostPicker && hosts.clubs[0] && (
                <p className={styles.hostLine}>
                    Hosted by {hosts.clubs[0].name}, {hosts.clubs[0].collegeName}
                </p>
            )}

            {showHostPicker && hosts && (
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="fest-host">
                        Hosted by
                    </label>
                    <select
                        id="fest-host"
                        className={styles.select}
                        value={host}
                        onChange={(e) => setHost(e.target.value)}
                        required
                    >
                        {!host && <option value="">Pick a club or college</option>}
                        {hosts.clubs.length > 0 && (
                            <optgroup label="Your clubs">
                                {hosts.clubs.map((c) => (
                                    <option key={c.id} value={`club:${c.id}`}>
                                        {c.name}, {c.collegeName}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                        {hosts.colleges && hosts.colleges.length > 0 && (
                            <optgroup label="A college, with no club">
                                {hosts.colleges.map((c) => (
                                    <option key={c.id} value={`college:${c.id}`}>
                                        {c.name}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                    </select>
                    <span className={styles.hint}>The fest is listed at this college. Only its events can join it.</span>
                </div>
            )}

            <div className={styles.field}>
                <label className={styles.label} htmlFor="fest-name">
                    Name
                </label>
                <input
                    id="fest-name"
                    className={styles.input}
                    value={values.name}
                    onChange={set('name')}
                    maxLength={FEST_LIMITS.NAME_MAX}
                    minLength={FEST_LIMITS.NAME_MIN}
                    placeholder="e.g. Techtonic 2027"
                    required
                    autoComplete="off"
                />
            </div>

            <div className={styles.field}>
                <label className={styles.label} htmlFor="fest-tagline">
                    Tagline <span className={styles.optional}>optional</span>
                </label>
                <input
                    id="fest-tagline"
                    className={styles.input}
                    value={values.tagline}
                    onChange={set('tagline')}
                    maxLength={FEST_LIMITS.TAGLINE_MAX}
                    placeholder="e.g. Three days of code, music and street food"
                    autoComplete="off"
                />
                <span className={styles.count}>
                    {values.tagline.length}/{FEST_LIMITS.TAGLINE_MAX}
                </span>
            </div>

            <fieldset className={styles.dates}>
                <legend className={styles.label}>Dates</legend>
                <div className={styles.dateRow}>
                    <div className={styles.field}>
                        <label className={styles.subLabel} htmlFor="fest-start">
                            First day
                        </label>
                        <input
                            id="fest-start"
                            type="date"
                            className={styles.input}
                            value={values.startDate}
                            onChange={set('startDate')}
                            min={isNew ? today : undefined}
                            required
                        />
                    </div>
                    <div className={styles.field}>
                        <label className={styles.subLabel} htmlFor="fest-end">
                            Last day
                        </label>
                        <input
                            id="fest-end"
                            type="date"
                            className={styles.input}
                            value={values.endDate}
                            onChange={set('endDate')}
                            min={values.startDate || (isNew ? today : undefined)}
                            max={values.startDate ? addDays(values.startDate, FEST_LIMITS.MAX_DAYS - 1) : undefined}
                            required
                        />
                    </div>
                </div>
                <span className={dateError ? styles.fieldError : styles.hint} aria-live="polite">
                    {dateError ?? `Whole days, India time, up to ${FEST_LIMITS.MAX_DAYS} days.`}
                </span>
            </fieldset>

            <div className={styles.field}>
                <span className={styles.label}>
                    Cover image <span className={styles.optional}>optional</span>
                </span>
                <ImageUpload
                    value={values.coverImage}
                    onChange={(url) => setValues((v) => ({ ...v, coverImage: url }))}
                    label=""
                    disabled={busy}
                />
                {values.coverImage ? (
                    <button
                        type="button"
                        className={styles.textButton}
                        onClick={() => setValues((v) => ({ ...v, coverImage: '' }))}
                    >
                        Remove the cover
                    </button>
                ) : (
                    <span className={styles.hint}>A wide photo of the campus or last year’s fest works best.</span>
                )}
            </div>

            <div className={styles.field}>
                <label className={styles.label} htmlFor="fest-description">
                    About the fest
                </label>
                <textarea
                    id="fest-description"
                    className={styles.textarea}
                    value={values.description}
                    onChange={set('description')}
                    maxLength={FEST_LIMITS.DESCRIPTION_MAX}
                    minLength={FEST_LIMITS.DESCRIPTION_MIN}
                    rows={6}
                    placeholder="What it is, who it is for, and anything people should know before they come: passes, outside participants, accommodation."
                    required
                />
                <span className={styles.count}>
                    {values.description.length}/{FEST_LIMITS.DESCRIPTION_MAX}
                </span>
            </div>

            {error && (
                <p className={styles.error} role="alert">
                    {error}
                </p>
            )}

            <div className={styles.actions}>
                <button type="submit" className={styles.submit} disabled={busy}>
                    {busy ? 'Saving' : !isNew ? 'Save changes' : goesLiveAtOnce ? 'Put it on the board' : 'Send for approval'}
                </button>
                {isNew && !goesLiveAtOnce && (
                    <span className={styles.hint}>An admin checks it before it goes on the board.</span>
                )}
            </div>
        </form>
    );
}
