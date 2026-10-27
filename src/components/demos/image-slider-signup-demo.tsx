"use client";

import * as React from "react";
import { useActionState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { signup } from "@/lib/actions/auth";
import { toast } from "sonner";
import { authHref, safeRedirectPath } from "@/lib/utils";
import styles from "@/app/login/auth.module.css";
import AuthAside, { type AsideBubble } from "@/components/auth/AuthAside";
import TryDemo from "@/components/TryDemo";
import GoogleButton from "@/components/auth/GoogleButton";
import { useT } from "@/lib/i18n";

/* The forty group chats, or eight of them. */
const GROUP_CHATS: AsideBubble[] = [
  { from: "CSE 2nd Year Official", text: "Assignment 3 deadline moved?!", unread: 12, color: "#2f3bff" },
  { from: "Hostel B Wing", text: "who took my maggi", unread: 48, color: "#12a150" },
  { from: "Fest Volunteers", text: "Need 10 more for stage crew", unread: 7, color: "#e8457e" },
  { from: "Coding Club", text: "Hackathon reg closes tonight", unread: 3, color: "#7a3cff" },
  { from: "Placement Cell", text: "Pre-placement talk at 4 pm", unread: 21, color: "#0e8a96" },
  { from: "Robotics Core Team", text: "Bring the ESP32s tomorrow", unread: 5, color: "#f06a00" },
  { from: "Dance Crew", text: "Practice moved to 7", unread: 9, color: "#c98a00" },
  { from: "Class Reps", text: "Fwd: Fwd: Fwd: Notice", unread: 33, color: "#c2410c" },
];

/* ?redirect= is read in the browser rather than with useSearchParams, which
   would make the page render an empty Suspense fallback until JavaScript
   loads instead of the static form. Nothing needs it before then. */
const noSubscribe = () => () => {};
const readReturnTo = () => new URLSearchParams(window.location.search).get("redirect");

export function ImageSliderSignupDemo({ googleEnabled }: { googleEnabled: boolean }) {
  const returnTo = useSyncExternalStore(noSubscribe, readReturnTo, () => null);
  const [state, formAction, isPending] = useActionState(signup, null);
  const t = useT();

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message || "Account created");
      // First the two-question setup (college, interests), which then goes
      // on to the page that asked for an account (an event someone was
      // registering for), checked the same way the login form checks it,
      // or home when they came here on their own.
      // Navigate immediately — refreshUser() can stay pending forever, which
      // used to strand a newly signed-up user on this page. The full load
      // re-creates AuthProvider, so refreshing here first buys nothing.
      // See the login form for why this is not router.replace().
      const next = safeRedirectPath(returnTo, window.location.origin, "/");
      const welcome = new URL("/welcome", window.location.origin);
      welcome.searchParams.set("redirect", next);
      window.location.assign(welcome);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [returnTo, state]);

  return (
    <div className={styles.screen}>
      <AuthAside
        line={<>{t('auth.signupLineBefore')}<em>{t('auth.signupLineAccent')}</em></>}
        note={t('auth.signupNote')}
        bubbles={GROUP_CHATS}
      />

      <main className={styles.panel}>
        <div className={styles.form}>
          <p className={styles.label}>{t('auth.createAccount')}</p>
          <h1 className={styles.title}>{t('auth.startHere')}</h1>
          <p className={styles.subtitle}>
            {t('auth.signupBody')}
          </p>

          {googleEnabled && <GoogleButton returnTo={returnTo} />}

          <form action={formAction}>
            <div className={styles.fields}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="name">
                  {t('auth.fullName')}
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="email">
                  {t('auth.email')}
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
                    {t('auth.password')}
                  </label>
                  {/* The server enforces this; saying so up front beats
                      failing the form after they have typed it. */}
                  <span className={styles.quietLink}>{t('auth.min8')}</span>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  className={styles.input}
                  required
                />
              </div>
            </div>

            <button type="submit" className={styles.submit} disabled={isPending}>
              {isPending && (
                <Loader2 size={15} className={styles.spin} aria-hidden="true" />
              )}
              {isPending ? t('auth.creatingAccount') : t('auth.createAccount')}
            </button>
          </form>

          <TryDemo />

          <p className={styles.foot}>
            {t('auth.haveAccount')} <Link href={authHref(returnTo)}>{t('auth.signIn')}</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
