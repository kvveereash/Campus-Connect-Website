"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { ImageSlider } from "@/components/ui/image-slider";
import { Button } from "@/components/ui/shadcn-button";
import { Input } from "@/components/ui/shadcn-input";
import { Label } from "@/components/ui/shadcn-label";
import { Loader2 } from "lucide-react";
import { login } from "@/lib/actions/auth";
import { toast } from "sonner";

export function ImageSliderLoginDemo() {
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState(login, null);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message || "Logged in successfully");

      // Send the user back where they were headed before the middleware
      // bounced them here; fall back to their profile.
      // Only same-site paths are honoured, so a crafted ?redirect=//evil.com
      // cannot turn our login page into an open redirect.
      const requested = searchParams.get("redirect");
      const destination =
        requested && requested.startsWith("/") && !requested.startsWith("//")
          ? requested
          : "/profile";

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
  }, [searchParams, state]);

  const images = [
    "/auth-hero.png",
    "/hero-illustration.png",
    "/auth-hero-signup.png",
  ];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12,
      },
    },
  };

  return (
    <div className="w-full h-screen min-h-[800px] flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-[1200px] min-h-[800px] grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(15,31,28,0.08)] bg-transparent"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Left side: Image Slider */}
        <div className="hidden lg:block w-full h-full relative">
          <ImageSlider images={images} interval={4000} />
        </div>

        {/* Right side: Login Form */}
        <div className="w-full h-full flex flex-col items-center justify-center p-8 md:p-16 lg:p-20">
          <motion.div
            className="w-full max-w-md"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.h1 variants={itemVariants} className="text-3xl font-bold tracking-tight mb-2">
              Welcome Back
            </motion.h1>
            <motion.p variants={itemVariants} className="text-muted-foreground mb-8">
              Enter your credentials to access your account.
            </motion.p>

            {/* Google/Apple buttons were here. They had no handler — the app
                uses its own JWT auth and no OAuth provider is configured — so
                they were decorative controls that did nothing when clicked.
                Removed rather than faked; add them back alongside real OAuth. */}

            <motion.form variants={itemVariants} className="space-y-6" action={formAction}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="m@example.com" required />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input id="password" name="password" type="password" required />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Log In"
                )}
              </Button>
            </motion.form>

            <motion.p variants={itemVariants} className="text-center text-sm text-muted-foreground mt-8">
              Don't have an account?{" "}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Sign up
              </Link>
            </motion.p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
