import type { Metadata } from "next";
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
import { fontVariables } from "./fonts";
import DemoBanner from "@/components/DemoBanner";
import NavigationProgress from "@/components/NavigationProgress";

import SWRegister from "@/components/SWRegister"; // Added
import { GlobalNotificationListener } from "@/components/chat/GlobalNotificationListener";
import { CommandPalette } from "@/components/CommandPalette";


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
      className={fontVariables}
    >
      <body>
        <SWRegister /> {/* Added Service Worker Registration */}
        <NavigationProgress />
          <ModalProvider>
            <AuthProvider>
              <CommandProvider>
                <SmoothScroll />
                <ScrollReveal />
                <ChromeGate>
                  <Navbar />
                </ChromeGate>
                <main className="container">
                  <DemoBanner />
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
