"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { login } from "@/lib/actions/auth";
import { toast } from "sonner";
import { authHref, safeRedirectPath } from "@/lib/utils";
import styles from "@/app/login/auth.module.css";
import AuthAside, { type AsideBubble } from '@/components/auth/AuthAside';
import TryDemo from '@/components/TryDemo';

/* What lands on the board in a week, all of it in one place. */
const CAMPUS_ACTIVITY: AsideBubble[] = [
  { from: 'Hack the Monsoon', text: 'Registrations close Saturday', unread: 3, color: '#7a3cff' },
  { from: 'CodeCraft Society', text: 'New post: build night Thursday', unread: 2, color: '#2f3bff' },
  { from: 'Team finder', text: 'Fatima wants you on her team', unread: 1, color: '#12a150' },
  { from: 'Unplugged: Acoustic Night', text: '3 friends are going', unread: 4, color: '#e8457e' },
  { from: 'Football Finals', text: 'Mon · University Stadium', unread: 2, color: '#0e8a96' },
  { from: 'Messages', text: 'Harsh: kickoff call at 9?', unread: 6, color: '#f06a00' },
  { from: 'Leaderboard', text: 'You moved up to #4', unread: 1, color: '#c98a00' },
  { from: 'IIT Mumbai', text: '6 events this month', unread: 5, color: '#c2410c' },
];

export function ImageSliderLoginDemo() {
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState(login, null);

  /* Set by the middleware when a session cookie was present but no longer
     validates. Being asked to sign in again mid-session is confusing enough
     without the page pretending you had just arrived. */
  const expired = searchParams.get('reason') === 'expired';
  const returnTo = searchParams.get('redirect');
  // Set by /api/demo when the demo could not be opened.
  const demoProblem = searchParams.get('demo');

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message || "Logged in successfully");

      // Send the user back where they were headed before the middleware
      // bounced them here; fall back to their profile.
      // Only same-origin destinations are honoured, so a crafted
      // ?redirect=//evil.com (or /\evil.com, which slipped past the old
      // prefix check) cannot turn our login page into an open redirect.
      const destination = safeRedirectPath(returnTo, window.location.origin);

      // Navigate immediately, and do NOT wait on refreshUser().
      //
      // Two bugs lived here. The redirect used to sit inside
      // refreshUser().then(...), and refreshUser() can stay pending
      // indefinitely — so a user who logged in successfully was left sitting
      // on the login page, staring at a success toast. Awaiting it at all is
      // also pointless: the full page load below re-creates AuthProvider,
      // which fetches the session itself.
      //
      // It is a full load rather than router.replace() on purpose. The session
      // cookie is set by the server action, and a soft navigation re-runs the
      // middleware before that cookie is in play, so the middleware saw no
      // session and bounced straight back to /login.
      window.location.assign(destination);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [returnTo, state]);

  return (
    <div className={styles.screen}>
      {/* The landing page's sphere, held still. Three stock photographs used
          to rotate here on a four-second timer; none of them were of this
          campus, and a slideshow is a strange thing to ask someone to watch
          while they type a password. */}
      <AuthAside
        line={<>Everything happening, <em>in one place.</em></>}
        note="Events · Clubs · Colleges"
        bubbles={CAMPUS_ACTIVITY}
      />

      <main className={styles.panel}>
        <div className={styles.form}>
          <p className={styles.label}>{expired ? 'Session ended' : 'Sign in'}</p>
          <h1 className={styles.title}>
            {expired ? 'That took a while.' : 'Welcome back.'}
          </h1>
          <p className={styles.subtitle}>
            {expired
              ? 'Your session expired, so we need your password again. Nothing was lost — you will land back where you were.'
              : 'Your events, your clubs and everything you have registered for.'}
          </p>

          {/* Google/Apple buttons were here. They had no handler — the app
              uses its own JWT auth and no OAuth provider is configured — so
              they were decorative controls that did nothing when clicked.
              Removed rather than faked; add them back alongside real OAuth. */}

          <form action={formAction}>
            <div className={styles.fields}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.field}>
                <div className={styles.fieldHead}>
                  <label className={styles.fieldLabel} htmlFor="password">
                    Password
                  </label>
                  <Link href="/forgot-password" className={styles.quietLink}>
                    Forgot?
                  </Link>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  className={styles.input}
                  required
                />
              </div>
            </div>

            <button type="submit" className={styles.submit} disabled={isPending}>
              {isPending && (
                <Loader2 size={15} className={styles.spin} aria-hidden="true" />
              )}
              {isPending ? "Signing in" : "Sign in"}
            </button>
          </form>

          {demoProblem && (
            <p className={styles.subtitle} role="alert">
              {demoProblem === 'busy'
                ? 'The demo was opened a lot from this network in the last hour. Try again later, or sign up.'
                : 'The demo did not open this time. Try again in a moment.'}
            </p>
          )}
          <TryDemo />

          <p className={styles.foot}>
            {/* The return address goes along, so making an account on the
                way still ends on the page that asked for one. */}
            No account yet? <Link href={authHref(returnTo, "/signup")}>Create one</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
