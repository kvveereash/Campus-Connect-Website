import { ImageSliderSignupDemo } from "@/components/demos/image-slider-signup-demo";
import { googleConfigured } from "@/lib/google-oauth";

export const metadata = {
  title: "Sign Up",
  description: "Create an account on Campus Connect",
};

export default function SignupPage() {
  // Read on the server: the client secret's presence is not something the browser can see.
  return <ImageSliderSignupDemo googleEnabled={googleConfigured()} />;
}
