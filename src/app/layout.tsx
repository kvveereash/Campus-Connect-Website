import type { Metadata } from "next";
import { Inter, Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChromeGate from "@/components/ChromeGate";
import SmoothScroll from "@/components/SmoothScroll";
import FloatingChatButton from "@/components/FloatingChatButton";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { ModalProvider } from "@/context/ModalContext";
import { CommandProvider } from "@/context/CommandContext";
import GlobalModal from "@/components/GlobalModal";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL('https://campusconnect2026.netlify.app'),
  title: {
    default: 'Campus Connect',
    template: '%s | Campus Connect'
  },
  description: 'The ultimate platform for college students to discover events, join clubs, and connect with peers.',
  openGraph: {
    title: 'Campus Connect',
    description: 'Discover events, join clubs, and connect with peers.',
    url: 'https://campus-connect.demo', // Placeholder
    siteName: 'Campus Connect',
    images: [
      {
        url: '/og-image.png', // Placeholder
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  manifest: '/manifest.json',

  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Campus Connect',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Campus Connect',
    description: 'Discover events, join clubs, and connect with peers.',
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
      className={`${inter.variable} ${bricolage.variable} ${geistMono.variable}`}
    >
      <body>
        <SWRegister /> {/* Added Service Worker Registration */}
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ModalProvider>
            <AuthProvider>
              <CommandProvider>
                <SmoothScroll />
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
        </ThemeProvider>
      </body>
    </html >
  );
}
