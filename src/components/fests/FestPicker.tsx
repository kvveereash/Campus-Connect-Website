'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { getMyFests, type MyFest } from '@/lib/actions/fests';
import { festDateRange } from '@/app/fests/rules';
import styles from './fests.module.css';

interface Props {
    value: string | null;
    onChange(festId: string | null): void;
    /** Only fests at this college are offered: an event can only join a fest where it is hosted. */
    collegeId?: string;
}

/**
 * "Part of a fest" for the event create and edit forms. Lists the fests the
 * signed-in person runs and stays out of the way (renders nothing) for
 * everyone who runs none, which is almost everyone.
 */
export default function FestPicker({ value, onChange, collegeId }: Props) {
    const id = useId();
    const [fests, setFests] = useState<MyFest[] | null>(null);

    useEffect(() => {
        let live = true;
        getMyFests()
            .then((rows) => live && setFests(rows))
            .catch(() => live && setFests([]));
        return () => {
            live = false;
        };
    }, []);

    if (fests === null) return null;
    const options = collegeId ? fests.filter((f) => f.collegeId === collegeId) : fests;
    if (options.length === 0 && !value) return null;

    // An event already in a fest that is not listed (it ended, or someone
    // else runs it) keeps that fest unless it is changed here on purpose.
    const keepsUnlisted = value !== null && !options.some((f) => f.id === value);

    return (
        <div className={styles.picker}>
            <label className={styles.pickerLabel} htmlFor={id}>
                Part of a fest
            </label>
            <select
                id={id}
                className={styles.pickerSelect}
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value || null)}
            >
                <option value="">Not part of a fest</option>
                {keepsUnlisted && <option value={value}>The fest it is in now</option>}
                {options.map((fest) => (
                    <option key={fest.id} value={fest.id}>
                        {fest.name} ({festDateRange(fest.startDate, fest.endDate)})
                        {fest.verified ? '' : ', awaiting approval'}
                    </option>
                ))}
            </select>
            <span className={styles.pickerHint}>
                The event shows on the fest’s day-by-day timetable.{' '}
                <Link href="/fests/create" className={styles.pickerLink}>
                    Start a fest
                </Link>
            </span>
        </div>
    );
}
