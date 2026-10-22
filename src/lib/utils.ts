
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * A same-origin path to send someone to after sign-in, or the fallback.
 *
 * Prefix checks are not enough: browsers read `/\evil.com` as
 * `//evil.com`, which passes startsWith("/") && !startsWith("//"). Parsing
 * it the way the browser will, and comparing origins, is the check that holds.
 */
export function safeRedirectPath(value: string | null, origin: string, fallback = "/profile") {
    if (!value) return fallback
    try {
        const url = new URL(value, origin)
        if (url.origin !== origin) return fallback
        const path = `${url.pathname}${url.search}${url.hash}`
        // Same origin is not enough: '/.//evil.com' resolves to the path
        // '//evil.com', which the browser then treats as another site.
        if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return fallback
        return path
    } catch {
        return fallback
    }
}

/**
 * The sign-in (or sign-up) page, set to bring the visitor back to `returnTo`
 * afterwards. Someone who taps Register on an event and has to sign in first
 * should land back on that event, not start over from a list.
 */
export function authHref(returnTo: string | null, page: '/login' | '/signup' = '/login') {
    return returnTo ? `${page}?redirect=${encodeURIComponent(returnTo)}` : page
}
