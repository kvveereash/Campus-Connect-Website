"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { signup } from "@/lib/actions/auth";
import { toast } from "sonner";
import styles from "@/app/login/auth.module.css";

export function ImageSliderSignupDemo() {
  const [state, formAction, isPending] = useActionState(signup, null);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message || "Account created successfully!");
      // Navigate immediately — refreshUser() can stay pending forever, which
      // used to strand a newly signed-up user on this page. The full load
      // re-creates AuthProvider, so refreshing here first buys nothing.
      // See the login form for why this is not router.replace().
      window.location.assign("/events");
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <div className={styles.screen}>
      <aside className={styles.aside}>
        <div className={styles.glow} aria-hidden="true" />
        <span className={styles.wordmark}>Campus Connect</span>
        <div className={styles.asideBody}>
          <p className={styles.asideLine}>
            Campus life is spread across forty group chats.
          </p>
        </div>
        <span className={styles.asideNote}>One feed instead</span>
      </aside>

      <main className={styles.panel}>
        <div className={styles.form}>
          <p className={styles.label}>Create account</p>
          <h1 className={styles.title}>Start here.</h1>
          <p className={styles.subtitle}>
            Takes a minute. You can browse everything without one, but joining a
            club or registering for an event needs a name attached.
          </p>

          {/* Google/Apple buttons removed — no OAuth provider is wired up,
              so they were controls that did nothing. See the login form. */}

          <form action={formAction}>
            <div className={styles.fields}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="name">
                  Full name
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
                  {/* The server enforces this; saying so up front beats
                      failing the form after they have typed it. */}
                  <span className={styles.quietLink}>8 characters min</span>
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
              {isPending ? "Creating account" : "Create account"}
            </button>
          </form>

          <p className={styles.foot}>
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
