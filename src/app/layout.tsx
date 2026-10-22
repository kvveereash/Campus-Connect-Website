import type { Metadata } from "next";
import { Inter, Bricolage_Grotesque, Geist_Mono, Instrument_Serif } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChromeGate from "@/components/ChromeGate";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollReveal from "@/components/ScrollReveal";
import FloatingChatButton from "@/components/FloatingChatButton";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { ModalProvider } from "@/context/ModalContext";
import { CommandProvider } from "@/context/CommandContext";
import GlobalModal from "@/components/GlobalModal";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

import SWRegister from "@/components/SWRegister"; // Added
import { GlobalNotificationListener } from "@/components/chat/GlobalNotificationListener";
import { CommandPalette } from "@/components/CommandPalette";

// Three faces, each with one job. Inter carries reading text and controls.
// Bricolage Grotesque is the display voice — a grotesk with enough character
// to sound like students rather than a bank. Geist Mono is for labels, dates
// and counts: the small print of a noticeboard.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
// The accent: a serif italic for the odd word that should sound spoken, set
// against the grotesk the way a poster mixes a headline with a hand note.
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Campus Connect',
    template: '%s | Campus Connect'
  },
  description: 'The ultimate platform for college students to discover events, join clubs, and connect with peers.',
  openGraph: {
    title: 'Campus Connect',
    description: 'Discover events, join clubs, and connect with peers.',
    // url comes from metadataBase. This was a placeholder domain, and the
    // image it named (/og-image.png) does not exist, so shared links showed
    // the wrong address and a broken preview.
    // The image is src/app/opengraph-image.tsx; events, clubs and colleges
    // draw their own.
    siteName: 'Campus Connect',
    locale: 'en_IN',
    type: 'website',
  },
  manifest: '/manifest.json',

  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Campus Connect',
  },
  // Card type only: a fixed title here would label every shared event
  // "Campus Connect" on X, which otherwise reads each page's Open Graph tags.
  twitter: {
    card: 'summary_large_image',
  },
};

export const viewport = {
  themeColor: '#f5f4f0',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${bricolage.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
    >
      <body>
        <SWRegister /> {/* Added Service Worker Registration */}
          <ModalProvider>
            <AuthProvider>
              <CommandProvider>
                <SmoothScroll />
                <ScrollReveal />
                <ChromeGate>
                  <Navbar />
                </ChromeGate>
                <main className="container">
                  {children}
                </main>
                <ChromeGate>
                  <FloatingChatButton />
                  <Footer />
                </ChromeGate>
                <GlobalNotificationListener />
                <CommandPalette />
                <ToastProvider />
                <GlobalModal />
              </CommandProvider>
            </AuthProvider>
          </ModalProvider>
      </body>
    </html >
  );
}
