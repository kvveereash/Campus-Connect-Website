'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { en, hi, ta, type MessageKey, type Messages } from './messages';

/*
 * The interface language, chosen in the browser.
 *
 * Most pages are static and served from the CDN, so the server cannot know a
 * visitor's language without rendering every page per request (slow, with the
 * functions and the database on different continents). Instead the choice is
 * a cookie, read here: the server renders English, and on hydration the text
 * switches. A Hindi or Tamil reader sees English for a moment on a full page
 * load; every navigation after that is already in their language.
 */

export const LOCALES = ['en', 'hi', 'ta'] as const;
export type Locale = (typeof LOCALES)[number];

/** Each language named in itself, so a reader can find their own. */
export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', hi: 'हिन्दी', ta: 'தமிழ்' };

const MESSAGES: Record<Locale, Messages> = { en, hi, ta };
const COOKIE = 'cc-lang';
const listeners = new Set<() => void>();

function readCookie(): Locale {
    try {
        const match = document.cookie.match(/(?:^|;\s*)cc-lang=(en|hi|ta)\b/);
        return (match?.[1] as Locale | undefined) ?? 'en';
    } catch {
        return 'en';
    }
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function setLocale(locale: Locale) {
    // A year; Lax so it rides along on ordinary navigation and nothing else.
    document.cookie = `${COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = locale;
    listeners.forEach((l) => l());
}

export function useLocale(): Locale {
    return useSyncExternalStore(subscribe, readCookie, () => 'en');
}

function format(text: string, vars?: Record<string, string | number>) {
    return vars ? text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`)) : text;
}

/** `t('nav.events')`, or `t('board.count', { n: 4 })` for placeholders. */
export function useT() {
    const locale = useLocale();
    return useCallback(
        (key: MessageKey, vars?: Record<string, string | number>) => format(MESSAGES[locale][key] ?? en[key], vars),
        [locale],
    );
}

/** For server components: the English text on the server, the reader's language after hydration. */
export function T({ k, vars }: { k: MessageKey; vars?: Record<string, string | number> }) {
    return <>{useT()(k, vars)}</>;
}

/** Keeps <html lang> in step with the choice, for screen readers and fonts. Rendered once, in the layout. */
export function LocaleSync() {
    const locale = useLocale();
    useEffect(() => {
        document.documentElement.lang = locale;
    }, [locale]);
    return null;
}
