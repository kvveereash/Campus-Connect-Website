'use client';

import { useEffect } from 'react';

export default function SWRegister() {
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        // In development build assets keep the same URL between edits, so a
        // worker caching them would keep serving stale code. Remove any that a
        // previous session left behind instead.
        if (process.env.NODE_ENV !== 'production') {
            navigator.serviceWorker
                .getRegistrations()
                .then((regs) => regs.forEach((r) => r.unregister()))
                .catch(() => {});
            return;
        }

        // Registering directly rather than on `load`: this effect usually runs
        // after `load` has already fired, and a listener added then never runs.
        navigator.serviceWorker.register('/sw.js').catch((err) => {
            console.warn('Service worker registration failed:', err);
        });
    }, []);

    return null;
}
