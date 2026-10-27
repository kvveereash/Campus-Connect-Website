'use client';

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { isDemoEmail } from '@/lib/demo-account';
import { savePushSubscription, removePushSubscription } from '@/lib/actions/push';
import styles from './PushToggle.module.css';

/*
 * "Turn on notifications" for this browser. Permission is asked for only on
 * the click, never on load: a prompt nobody asked for is usually blocked for
 * good, and then the site can never ask again.
 *
 * Shows nothing when push is not configured (no public VAPID key), and
 * nothing in development, where SWRegister removes the service worker that
 * push needs.
 */

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
const AVAILABLE = PUBLIC_KEY !== '' && process.env.NODE_ENV === 'production';

// Both copies (settings page and the bell's dropdown) listen, so turning it
// off in one is reflected in the other.
const CHANGED = 'cc:push-changed';
// Which account this browser's subscription was last saved for.
const OWNER_KEY = 'cc-push-owner';

type Support = 'pending' | 'unsupported' | NotificationPermission;

function readSupport(): Support {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        return 'unsupported';
    }
    return Notification.permission;
}

function onChange(callback: () => void) {
    window.addEventListener(CHANGED, callback);
    return () => window.removeEventListener(CHANGED, callback);
}

function announce() {
    window.dispatchEvent(new Event(CHANGED));
}

function readOwner(): string | null {
    try {
        return localStorage.getItem(OWNER_KEY);
    } catch {
        return null;
    }
}

function writeOwner(userId: string | null) {
    try {
        if (userId) localStorage.setItem(OWNER_KEY, userId);
        else localStorage.removeItem(OWNER_KEY);
    } catch {
        // Private mode: the subscription is re-saved on the next visit instead.
    }
}

async function currentSubscription(): Promise<PushSubscription | null> {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration ? registration.pushManager.getSubscription() : null;
}

/* The worker is registered on load, but may still be installing on a first
   visit. Waiting on `ready` alone would hang forever if registration failed. */
function readyWorker(ms: number): Promise<ServiceWorkerRegistration | null> {
    return Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
    ]);
}

// The key arrives URL-safe base64; subscribe() wants the raw bytes.
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
    const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const bytes = new Uint8Array(new ArrayBuffer(raw.length));
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes;
}

function toInput(subscription: PushSubscription) {
    const json = subscription.toJSON();
    return {
        endpoint: json.endpoint ?? subscription.endpoint,
        keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
    };
}

export default function PushToggle({
    compact = false,
    className,
    heading,
}: {
    /** One line, for the bottom of the notifications dropdown. */
    compact?: boolean;
    /** Wraps the whole thing, so a section disappears with it when hidden. */
    className?: string;
    heading?: ReactNode;
}) {
    const { user } = useAuth();
    const userId = user?.id ?? null;
    const support = useSyncExternalStore(onChange, readSupport, () => 'pending' as Support);
    const [subscribed, setSubscribed] = useState<boolean | null>(null);
    const [busy, setBusy] = useState(false);

    const live = AVAILABLE && support !== 'pending' && support !== 'unsupported';

    useEffect(() => {
        if (!live) return;
        let active = true;
        const check = () => {
            currentSubscription()
                .then(async (subscription) => {
                    if (!active) return;
                    setSubscribed(subscription !== null);
                    // Signed in as someone else since this browser subscribed:
                    // re-point the device so it gets this account's notifications.
                    if (subscription && userId && Notification.permission === 'granted' && readOwner() !== userId) {
                        const result = await savePushSubscription(toInput(subscription));
                        if (result.success) writeOwner(userId);
                    }
                })
                .catch(() => {
                    if (active) setSubscribed(false);
                });
        };
        check();
        window.addEventListener(CHANGED, check);
        return () => {
            active = false;
            window.removeEventListener(CHANGED, check);
        };
    }, [live, userId]);

    const turnOn = async () => {
        setBusy(true);
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;

            const registration = await readyWorker(10_000);
            if (!registration) {
                toast.error('Notifications could not start in this browser. Reload the page and try again.');
                return;
            }
            const subscription =
                (await registration.pushManager.getSubscription()) ??
                (await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: keyBytes(PUBLIC_KEY),
                }));

            const result = await savePushSubscription(toInput(subscription));
            if (!result.success) {
                // Not saved means nothing would ever arrive; do not leave the
                // browser believing it is subscribed.
                await subscription.unsubscribe().catch(() => false);
                toast.error(result.error);
                return;
            }
            writeOwner(userId);
            toast.success('Notifications are on for this device');
        } catch {
            toast.error('Could not turn on notifications. Reload the page and try again.');
        } finally {
            setBusy(false);
            // Permission may have changed too, so both the store and the
            // subscription check re-read.
            announce();
        }
    };

    const turnOff = async () => {
        setBusy(true);
        try {
            const subscription = await currentSubscription();
            if (subscription) {
                const endpoint = subscription.endpoint;
                // Unsubscribing first: if the server call fails, the push
                // service reports the address gone and the next send removes it.
                await subscription.unsubscribe();
                await removePushSubscription(endpoint);
            }
            writeOwner(null);
        } catch {
            toast.error('Could not turn off notifications. Reload the page and try again.');
        } finally {
            setBusy(false);
            announce();
        }
    };

    if (!AVAILABLE || isDemoEmail(user?.email)) return null;
    if (compact && (support === 'unsupported' || support === 'pending')) return null;

    let body: ReactNode = null;
    if (support === 'unsupported') {
        body = (
            <p className={styles.note}>
                This browser cannot show notifications from websites. On an iPhone or iPad, add
                Campus Connect to your home screen and open it from there.
            </p>
        );
    } else if (support === 'denied') {
        body = (
            <p className={styles.note}>
                {compact
                    ? 'Notifications are blocked. Allow them in this site’s browser settings.'
                    : 'Notifications are blocked for this site. Open the site settings from the icon beside the address bar, set Notifications to Allow, then reload.'}
            </p>
        );
    } else if (support !== 'pending' && subscribed !== null) {
        body =
            subscribed && support === 'granted' ? (
                <>
                    <span className={styles.status}>
                        <span className={styles.dot} aria-hidden="true" />
                        Notifications are on
                    </span>
                    <button type="button" className={styles.link} onClick={turnOff} disabled={busy}>
                        {busy ? 'Turning off' : 'Turn off'}
                    </button>
                </>
            ) : compact ? (
                <button type="button" className={styles.link} onClick={turnOn} disabled={busy}>
                    {busy ? 'Turning on' : 'Turn on notifications'}
                </button>
            ) : (
                <button type="button" className="btn btn-outline" onClick={turnOn} disabled={busy}>
                    {busy ? 'Turning on' : 'Turn on notifications'}
                </button>
            );
    }

    return (
        <div className={className}>
            {heading}
            {!compact && (
                <p className={styles.note}>
                    Reminders, messages and event updates on this device, even when Campus Connect
                    is closed.
                </p>
            )}
            {/* Fixed height while the browser is checked, so nothing below moves. */}
            <div className={compact ? styles.compactRow : styles.row} aria-live="polite">
                {body}
            </div>
        </div>
    );
}
