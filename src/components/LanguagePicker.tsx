'use client';

import { Languages } from 'lucide-react';
import { LOCALES, LOCALE_NAMES, setLocale, useLocale, useT, type Locale } from '@/lib/i18n';
import styles from './LanguagePicker.module.css';

/** The interface language. Event and club text stays as its authors wrote it. */
export default function LanguagePicker({ className }: { className?: string }) {
    const locale = useLocale();
    const t = useT();

    return (
        <label className={`${styles.picker} ${className ?? ''}`}>
            <Languages size={14} aria-hidden="true" />
            <span className={styles.label}>{t('lang.label')}</span>
            <select
                className={styles.select}
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
            >
                {LOCALES.map((l) => (
                    <option key={l} value={l} lang={l}>
                        {LOCALE_NAMES[l]}
                    </option>
                ))}
            </select>
        </label>
    );
}
