import { Suspense } from "react";
import { ImageSliderLoginDemo } from "@/components/demos/image-slider-login-demo";
import { googleConfigured } from "@/lib/google-oauth";

export const metadata = {
  title: "Login",
  description: "Sign in to Campus Connect",
};

export default function LoginPage() {
  // The form reads ?redirect= via useSearchParams, which opts the page out of
  // static prerendering unless it sits behind a Suspense boundary.
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ImageSliderLoginDemo googleEnabled={googleConfigured()} />
    </Suspense>
  );
}
