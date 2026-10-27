'use client';

import { useRef, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { closeRecruitment, openRecruitment } from '@/lib/actions/recruitment';
import { MAX_QUESTIONS, QUESTION_MAX_LENGTH } from '@/lib/recruitment-rules';
import styles from './Recruitment.module.css';

interface RecruitmentSettingsProps {
    clubId: string;
    recruiting: boolean;
    questions: string[];
}

interface Draft {
    key: number;
    text: string;
}

/** Club admins: write up to three questions, then open or close applications. */
export default function RecruitmentSettings({ clubId, recruiting, questions }: RecruitmentSettingsProps) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    // Keys outlive reordering when a middle question is removed, so React
    // does not move one question's text into another's field.
    const nextKey = useRef(Math.max(questions.length, 1));
    const [drafts, setDrafts] = useState<Draft[]>(() =>
        questions.length > 0 ? questions.map((text, key) => ({ key, text })) : [{ key: 0, text: '' }]
    );

    const filled = drafts.map((d) => d.text.trim()).filter(Boolean);
    const unchanged = filled.length === questions.length && filled.every((q, i) => q === questions[i]);

    const save = (e: FormEvent) => {
        e.preventDefault();
        if (filled.length === 0) {
            toast.error('Write at least one question first.');
            return;
        }
        startTransition(async () => {
            const result = await openRecruitment(clubId, filled);
            if (result.success) {
                toast.success(recruiting ? 'Questions saved.' : 'Applications are open.');
                router.refresh();
            } else {
                toast.error(result.error || 'That did not save. Try again in a moment.');
            }
        });
    };

    const close = () => {
        startTransition(async () => {
            const result = await closeRecruitment(clubId);
            if (result.success) {
                toast.success('Applications are closed. Pending ones can still be decided.');
                router.refresh();
            } else {
                toast.error(result.error || 'That did not save. Try again in a moment.');
            }
        });
    };

    return (
        <form className={styles.panel} onSubmit={save} noValidate>
            <p className={`${styles.state} ${recruiting ? styles.stateOpen : ''}`}>
                <span className={styles.stateDot} aria-hidden="true" />
                {recruiting
                    ? 'Applications are open. Students see these questions on this page.'
                    : 'Applications are closed. Write a few questions and open them.'}
            </p>

            <div className={styles.settingsList}>
                {drafts.map((draft, i) => {
                    const id = `recruit-question-${draft.key}`;
                    return (
                        <div key={draft.key} className={styles.settingRow}>
                            <div className={styles.settingField}>
                                <label htmlFor={id} className={styles.label}>
                                    <span>Question {String(i + 1).padStart(2, '0')}</span>
                                    <span className={styles.counter}>
                                        {draft.text.length}/{QUESTION_MAX_LENGTH}
                                    </span>
                                </label>
                                <input
                                    id={id}
                                    className={styles.input}
                                    maxLength={QUESTION_MAX_LENGTH}
                                    placeholder={i === 0 ? 'Why do you want to join?' : 'What have you made or done that you are proud of?'}
                                    value={draft.text}
                                    onChange={(e) => {
                                        const text = e.target.value;
                                        setDrafts((prev) => prev.map((d) => (d.key === draft.key ? { ...d, text } : d)));
                                    }}
                                />
                            </div>
                            {drafts.length > 1 && (
                                <button
                                    type="button"
                                    className={styles.remove}
                                    aria-label={`Remove question ${i + 1}`}
                                    onClick={() => setDrafts((prev) => prev.filter((d) => d.key !== draft.key))}
                                >
                                    <X size={16} aria-hidden="true" />
                                </button>
                            )}
                        </div>
                    );
                })}

                {drafts.length < MAX_QUESTIONS && (
                    <button
                        type="button"
                        className={styles.textButton}
                        onClick={() => {
                            const key = nextKey.current++;
                            setDrafts((prev) => [...prev, { key, text: '' }]);
                        }}
                    >
                        <Plus size={14} aria-hidden="true" />
                        Add a question
                    </button>
                )}
            </div>

            <div className={styles.buttons}>
                <button
                    type="submit"
                    className={styles.primary}
                    disabled={pending || filled.length === 0 || (recruiting && unchanged)}
                >
                    {recruiting ? 'Save questions' : 'Open applications'}
                </button>
                {recruiting && (
                    <button type="button" className={styles.secondary} disabled={pending} onClick={close}>
                        Close applications
                    </button>
                )}
            </div>
        </form>
    );
}
