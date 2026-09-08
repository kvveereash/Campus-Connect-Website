"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { ImageSlider } from "@/components/ui/image-slider";
import { Button } from "@/components/ui/shadcn-button";
import { Input } from "@/components/ui/shadcn-input";
import { Label } from "@/components/ui/shadcn-label";
import { Loader2 } from "lucide-react";
import { signup } from "@/lib/actions/auth";
import { toast } from "sonner";

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

  const images = [
    "/auth-hero-signup.png",
    "/hero-illustration.png",
    "/auth-hero.png",
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

        {/* Right side: Signup Form */}
        <div className="w-full h-full flex flex-col items-center justify-center p-8 md:p-16 lg:p-20">
          <motion.div
            className="w-full max-w-md bg-transparent"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.h1 variants={itemVariants} className="text-3xl font-bold tracking-tight mb-2">
              Join the movement
            </motion.h1>
            <motion.p variants={itemVariants} className="text-muted-foreground mb-8">
              Start your journey with Campus Connect today.
            </motion.p>

            {/* Google/Apple buttons removed — no OAuth provider is wired up,
                so they were controls that did nothing. See the login form. */}

            <motion.form variants={itemVariants} className="space-y-4" action={formAction}>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" type="text" placeholder="John Doe" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="student@college.edu" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required minLength={8} />
              </div>
              <Button type="submit" className="w-full mt-6" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </motion.form>

            <motion.p variants={itemVariants} className="text-center text-sm text-muted-foreground mt-8 bg-transparent">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Log in
              </Link>
            </motion.p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
