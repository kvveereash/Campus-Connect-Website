/*
 * The shared demo account behind "Try the demo". Kept apart from
 * src/lib/demo.ts (server only) because the browser needs to recognise it
 * too, to show the demo banner.
 */
export const DEMO_EMAIL = 'demo@campusconnect.app';

export const isDemoEmail = (email: string | null | undefined) => email?.toLowerCase() === DEMO_EMAIL;

/** What the demo account is told when it tries something only a real account may do. */
export const DEMO_REFUSAL = 'The demo account can look around but not change this. Sign up free to do it for real.';
