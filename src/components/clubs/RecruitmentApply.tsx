'use client';

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { applyToClub } from '@/lib/actions/recruitment';
import { ANSWER_MAX_LENGTH } from '@/lib/recruitment-rules';
import entrance from '@/components/entrance.module.css';
import RecruitmentQuestions from './RecruitmentQuestions';
import styles from './Recruitment.module.css';

interface RecruitmentApplyProps {
    clubId: string;
    clubName: string;
    questions: string[];
}

/**
 * The questions, then an Apply button that turns them into a form in place.
 * Inline rather than a dialog: the answers can be long, and a phone keyboard
 * over a modal leaves almost no room to write them.
 */
export default function RecruitmentApply({ clubId, clubName, questions }: RecruitmentApplyProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ''));
    const [pending, startTransition] = useTransition();
    const firstField = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (open) firstField.current?.focus();
    }, [open]);

    const complete = answers.every((a) => a.trim().length > 0);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!complete) {
            toast.error('Answer every question before sending.');
            return;
        }
        startTransition(async () => {
            const result = await applyToClub(clubId, answers);
            if (result.success) {
                toast.success(`Application sent to ${clubName}.`);
                router.refresh();
            } else {
                toast.error(result.error || 'Your application did not send. Try again in a moment.');
            }
        });
    };

    if (!open) {
        return (
            <>
                <RecruitmentQuestions questions={questions} />
                <div className={`${styles.buttons} ${styles.applyRow}`}>
                    <button
                        type="button"
                        className={styles.primary}
                        onClick={() => setOpen(true)}
                    >
                        Apply
                    </button>
                </div>
            </>
        );
    }

    return (
        <form className={`${styles.form} ${entrance.fade}`} onSubmit={submit} noValidate>
            {questions.map((q, i) => {
                const id = `apply-${clubId}-${i}`;
                return (
                    <div key={i} className={styles.formField}>
                        <label htmlFor={id} className={styles.label}>
                            <span>Question {String(i + 1).padStart(2, '0')}</span>
                            <span className={styles.counter}>
                                {answers[i].length}/{ANSWER_MAX_LENGTH}
                            </span>
                        </label>
                        <p className={styles.formQuestion} id={`${id}-q`}>
                            {q}
                        </p>
                        <textarea
                            id={id}
                            ref={i === 0 ? firstField : undefined}
                            className={styles.textarea}
                            aria-describedby={`${id}-q`}
                            maxLength={ANSWER_MAX_LENGTH}
                            required
                            value={answers[i]}
                            onChange={(e) => {
                                const value = e.target.value;
                                setAnswers((prev) => prev.map((a, j) => (j === i ? value : a)));
                            }}
                        />
                    </div>
                );
            })}

            <p className={styles.hint}>
                The club’s admins see your name, college and these answers. You can apply once.
            </p>

            <div className={styles.buttons}>
                <button type="submit" className={styles.primary} disabled={pending}>
                    {pending ? 'Sending…' : 'Send application'}
                </button>
                <button
                    type="button"
                    className={styles.secondary}
                    disabled={pending}
                    onClick={() => setOpen(false)}
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
