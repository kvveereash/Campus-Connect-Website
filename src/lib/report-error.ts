/**
 * Tells the server that a page crashed in someone's browser. Server errors are
 * logged where they happen (src/instrumentation.ts); a crash in a client
 * component happens only in the browser, and without this nobody would know.
 *
 * Best effort: a beacon survives the page being closed, and any failure here
 * is swallowed, because the reader already has an error screen and does not
 * need a second one.
 */
export function reportClientError(error: Error & { digest?: string }, boundary: 'page' | 'root') {
    try {
        const body = JSON.stringify({
            boundary,
            digest: error.digest,
            name: error.name,
            message: error.message,
            path: window.location.pathname,
        });
        const blob = new Blob([body], { type: 'application/json' });
        if (!navigator.sendBeacon?.('/api/client-errors', blob)) {
            void fetch('/api/client-errors', { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {});
        }
    } catch {
        // Reporting must never be the thing that breaks.
    }
}
