'use client';

import { usePathname } from 'next/navigation';

/**
 * Hides the site chrome on the screens that are their own full-bleed thing.
 *
 * Login and signup are a black panel bled to the window edge; a navbar
 * floating over that panel — with a "Login" button on the login page — read
 * as two designs stacked on each other. Everything else keeps the chrome.
 *
 * The Navbar and Footer are passed in as children rather than imported here,
 * so the Footer stays a server component: passing a server component through
 * a client boundary as children does not pull it onto the client.
 */
const BARE_ROUTES = ['/login', '/signup', '/forgot-password'];

export default function ChromeGate({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const isBare =
        BARE_ROUTES.includes(pathname) || pathname.startsWith('/reset-password');

    if (isBare) return null;

    return <>{children}</>;
}
