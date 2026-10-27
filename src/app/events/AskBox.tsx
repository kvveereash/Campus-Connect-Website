'use client';

import { useId, useRef, useState, useTransition } from 'react';
import { MessageSquareText } from 'lucide-react';
import type { AskFilters } from '@/lib/actions/ask';
import { useLocale, useT } from '@/lib/i18n';
import styles from './AskBox.module.css';

/**
 * "Ask in plain words": a question becomes the board's own filters. Closed by
 * default so the search box stays the obvious way in; the answer is shown as
 * one line saying how the question was read, with a way back.
 */
export default function AskBox({ onApply, onClear }: { onApply: (filters: AskFilters) => void; onClear: () => void }) {
    const ids = useId();
    const t = useT();
    const locale = useLocale();
    const inputRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [question, setQuestion] = useState('');
    const [summary, setSummary] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim() || pending) return;
        setError(null);
        startTransition(async () => {
            try {
                // Loaded on first use: most visitors never ask, and the board should not carry it.
                const { askEvents } = await import('@/lib/actions/ask');
                const result = await askEvents(question, locale);
                if (result.success) {
                    onApply(result.data);
                    setSummary(result.data.summary);
                } else {
                    setError(result.error);
                }
            } catch {
                setError(t('ask.failed'));
            }
        });
    };

    const clear = () => {
        setSummary(null);
        setQuestion('');
        onClear();
        inputRef.current?.focus();
    };

    if (!open) {
        return (
            <button
                type="button"
                className={styles.toggle}
                onClick={() => {
                    setOpen(true);
                    // After React shows the field.
                    requestAnimationFrame(() => inputRef.current?.focus());
                }}
            >
                <MessageSquareText size={14} aria-hidden="true" />
                {t('ask.toggle')}
            </button>
        );
    }

    return (
        <div className={styles.box}>
            <form className={styles.form} onSubmit={submit}>
                <input
                    ref={inputRef}
                    aria-label={t('ask.label')}
                    className={styles.input}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={t('ask.placeholder')}
                    maxLength={200}
                    autoComplete="off"
                    enterKeyHint="go"
                    aria-describedby={`${ids}-status`}
                />
                <button type="submit" className={styles.ask} disabled={pending || !question.trim()}>
                    {pending ? t('ask.reading') : t('ask.submit')}
                </button>
            </form>
            <div id={`${ids}-status`} className={styles.status} aria-live="polite">
                {error ? (
                    <p className={styles.error}>{error}</p>
                ) : summary ? (
                    <p className={styles.summary}>
                        {summary}
                        <button type="button" className={styles.clear} onClick={clear}>
                            {t('ask.clear')}
                        </button>
                    </p>
                ) : (
                    <p className={styles.hint}>{t('ask.hint')}</p>
                )}
            </div>
        </div>
    );
}
