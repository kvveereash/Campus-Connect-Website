'use client';

import { useEffect } from 'react';
import { istDayKey, resolveSource, type Source } from './sources';

/*
 * Counts a view of an event page for the organiser's numbers: once per
 * browser, per event, per Indian day, with where the visitor came from.
 * Nothing about the person is sent, only the event and the source.
 *
 * It also keeps the source for the rest of the browser session, so a
 * registration made a few pages later can still say what brought them here
 * (registrationSource below).
 */

const COUNTED_KEY = 'cc:event-views';
const SOURCE_KEY = 'cc:event-sources';

/* Within one page load, in case storage is unavailable and the effect runs twice. */
const sentThisLoad = new Set<string>();

function readMap(storage: Storage, key: string): Record<string, string> {
    try {
        const parsed: unknown = JSON.parse(storage.getItem(key) ?? '{}');
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
    } catch {
        return {};
    }
}

/** True the first time this browser opens this event today; records that it has. */
function firstViewToday(eventId: string): boolean {
    const today = istDayKey();
    if (sentThisLoad.has(`${eventId}:${today}`)) return false;
    sentThisLoad.add(`${eventId}:${today}`);
    try {
        const seen = readMap(window.localStorage, COUNTED_KEY);
        if (seen[eventId] === today) return false;
        // Only today's entries are kept, so the record never grows past one day of browsing.
        const kept = Object.fromEntries(Object.entries(seen).filter(([, day]) => day === today));
        kept[eventId] = today;
        window.localStorage.setItem(COUNTED_KEY, JSON.stringify(kept));
    } catch {
        // Private browsing or storage turned off: count it, this load only.
    }
    return true;
}

/* The first real source in a session wins over "direct": someone who came
   from WhatsApp and then reloaded still came from WhatsApp. */
function rememberSource(eventId: string, source: Source) {
    try {
        const sources = readMap(window.sessionStorage, SOURCE_KEY);
        const existing = sources[eventId];
        if (existing && existing !== 'direct') return;
        sources[eventId] = source;
        window.sessionStorage.setItem(SOURCE_KEY, JSON.stringify(sources));
    } catch {
        // Without session storage the registration just goes unattributed.
    }
}

/**
 * Where the person registering for `eventId` came from in this browser
 * session, or null if the event page was not opened in it. For the join
 * action, which normalises it again on the server.
 */
export function registrationSource(eventId: string): string | null {
    try {
        return readMap(window.sessionStorage, SOURCE_KEY)[eventId] ?? null;
    } catch {
        return null;
    }
}

/* Moving between pages inside the app leaves document.referrer as whatever
   page the visit started from, so it says nothing about the last page. If
   the page that was loaded is not this one, the visitor got here by a link
   inside the site. */
function arrivedInsideSite(): boolean {
    try {
        const [entry] = performance.getEntriesByType('navigation');
        return Boolean(entry && new URL(entry.name).pathname !== window.location.pathname);
    } catch {
        return false;
    }
}

function send(eventId: string, source: Source) {
    const url = `/api/events/${encodeURIComponent(eventId)}/view?source=${source}`;
    try {
        if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(url)) return;
    } catch {
        // Fall through to fetch.
    }
    fetch(url, { method: 'POST', keepalive: true, credentials: 'omit' }).catch(() => {
        // A missed view is not worth telling anyone about.
    });
}

export default function ViewBeacon({ eventId }: { eventId: string }) {
    useEffect(() => {
        const ref = new URLSearchParams(window.location.search).get('ref');
        const referrer = !ref && arrivedInsideSite() ? window.location.origin : document.referrer;
        const source = resolveSource(ref, referrer, window.location.host);

        rememberSource(eventId, source);
        if (firstViewToday(eventId)) send(eventId, source);
    }, [eventId]);

    return null;
}
