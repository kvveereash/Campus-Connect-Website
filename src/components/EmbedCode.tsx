'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Code } from 'lucide-react';
import CopyLink from '@/components/CopyLink';
import { SITE_URL } from '@/lib/site';
import styles from './EmbedCode.module.css';

type Theme = 'light' | 'dark';

const THEMES: { value: Theme; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
];

/**
 * The one line a college or club pastes into its own website to list its
 * upcoming events there (public/embed.js and src/lib/embed.ts), with a live
 * preview. Closed by default, so the preview frame only loads when asked for.
 */
export default function EmbedCode({ kind, id }: { kind: 'college' | 'club'; id: string }) {
    const [open, setOpen] = useState(false);
    const [theme, setTheme] = useState<Theme>('light');
    const [height, setHeight] = useState(360);
    const frameRef = useRef<HTMLIFrameElement>(null);
    const panelId = useId();
    const themeName = useId();

    // Always the live address: the line is pasted into other websites.
    const snippet = `<script src="${SITE_URL}/embed.js" data-${kind}="${id}"${theme === 'dark' ? ' data-theme="dark"' : ''} async></script>`;
    // The preview is same-origin, so a local or preview deploy shows its own data.
    const previewSrc = `/embed/${kind}/${encodeURIComponent(id)}${theme === 'dark' ? '?theme=dark' : ''}`;

    useEffect(() => {
        if (!open) return;
        const onMessage = (event: MessageEvent) => {
            const frame = frameRef.current;
            if (!frame || event.source !== frame.contentWindow || event.origin !== window.location.origin) return;
            const data: unknown = event.data;
            if (typeof data !== 'object' || data === null) return;
            const { type, height: reported } = data as { type?: unknown; height?: unknown };
            if (type !== 'campus-connect:height' || typeof reported !== 'number' || !Number.isFinite(reported)) return;
            setHeight(Math.min(Math.max(Math.round(reported), 80), 2000));
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [open]);

    return (
        <section className={styles.embed}>
            <button
                type="button"
                className={styles.toggle}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpen((v) => !v)}
            >
                <Code size={16} aria-hidden="true" className={styles.toggleIcon} />
                <span className={styles.toggleText}>Show these events on your website</span>
                <ChevronDown size={18} aria-hidden="true" className={styles.chevron} />
            </button>

            {open && (
                <div id={panelId} className={styles.panel}>
                    <p className={styles.lead}>
                        Paste this line into your website&apos;s HTML where the events should appear. It lists the
                        next 10 {kind === 'college' ? 'events here' : 'events from this club'} and updates on its own.
                    </p>

                    <fieldset className={styles.themes}>
                        <legend className={styles.legend}>Theme</legend>
                        <div className={styles.choices}>
                            {THEMES.map((t) => (
                                <label key={t.value} className={styles.choice}>
                                    <input
                                        type="radio"
                                        name={themeName}
                                        value={t.value}
                                        checked={theme === t.value}
                                        onChange={() => setTheme(t.value)}
                                        className={styles.radio}
                                    />
                                    <span className={styles.choiceLabel}>{t.label}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <div className={styles.codeBox}>
                        <pre className={styles.code}>
                            <code>{snippet}</code>
                        </pre>
                        <CopyLink value={snippet} label="Copy code" className={styles.copy} />
                    </div>

                    <p className={styles.legend}>Preview</p>
                    <div className={styles.preview}>
                        <iframe
                            ref={frameRef}
                            src={previewSrc}
                            title="Preview of the events widget"
                            loading="lazy"
                            className={styles.frame}
                            style={{ height }}
                        />
                    </div>
                </div>
            )}
        </section>
    );
}
