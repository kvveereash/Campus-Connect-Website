'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Download, X } from 'lucide-react';
import styles from './InstallPrompt.module.css';

const DISMISSED = 'cc-install-dismissed';

/* Chrome's install event; not in the DOM types. */
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function dismissedBefore() {
    try {
        return localStorage.getItem(DISMISSED) === '1';
    } catch {
        return false;
    }
}

/* Where this browser stands: "off" when installed or dismissed before. A
   primitive, so the snapshot is stable between renders. */
function readSetting(): 'off' | 'ios' | 'other' {
    const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone || dismissedBefore()) return 'off';
    // iPhone and iPad Safari have no install event: explain the steps.
    const ua = navigator.userAgent;
    return /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua) ? 'ios' : 'other';
}
const noSubscribe = () => () => {};

/**
 * "Add Campus Connect to your home screen", for students who are already
 * using it (it is on Home and My events, not the landing page). Uses the
 * browser's own install prompt where there is one (Android, desktop Chrome)
 * and the Share → Add to Home Screen steps on iPhone. Never shown once the
 * app is installed, or after it is dismissed.
 */
export default function InstallPrompt() {
    const setting = useSyncExternalStore(noSubscribe, readSetting, () => 'off' as const);
    const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (setting !== 'other') return;
        const onPrompt = (e: Event) => {
            e.preventDefault();
            setInstallEvent(e as InstallEvent);
        };
        window.addEventListener('beforeinstallprompt', onPrompt);
        return () => window.removeEventListener('beforeinstallprompt', onPrompt);
    }, [setting]);

    const dismiss = () => {
        setDismissed(true);
        try {
            localStorage.setItem(DISMISSED, '1');
        } catch {
            // Private mode: it just shows again next time.
        }
    };

    const install = async () => {
        if (!installEvent) return;
        await installEvent.prompt();
        await installEvent.userChoice.catch(() => null);
        setInstallEvent(null);
        dismiss();
    };

    const ios = setting === 'ios';
    if (dismissed || setting === 'off' || (!ios && !installEvent)) return null;

    return (
        <aside className={styles.card} aria-label="Install the app">
            <Download size={20} className={styles.icon} aria-hidden="true" />
            <div className={styles.text}>
                <p className={styles.title}>Keep Campus Connect on your home screen</p>
                <p className={styles.body}>
                    {ios
                        ? 'Tap Share in Safari, then "Add to Home Screen". It opens like an app, tickets and all.'
                        : 'It opens like an app, with your tickets one tap away.'}
                </p>
            </div>
            {!ios && installEvent && (
                <button type="button" className="btn btn-primary" onClick={install}>
                    Install
                </button>
            )}
            <button type="button" className={styles.close} onClick={dismiss} aria-label="Not now">
                <X size={18} aria-hidden="true" />
            </button>
        </aside>
    );
}
