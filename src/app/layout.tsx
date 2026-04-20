import type { Metadata } from "next";
import { Inter, Outfit, Fraunces } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingChatButton from "@/components/FloatingChatButton";
import { AuthProvider } from "@/context/AuthContext";
import { EventProvider } from "@/context/EventContext";
import { TeamProvider } from "@/context/TeamContext";
import { ClubProvider } from "@/context/ClubContext"; // Added ClubProvider import
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { ModalProvider } from "@/context/ModalContext";
import { CommandProvider } from "@/context/CommandContext";
import GlobalModal from "@/components/GlobalModal";
import "./globals.css";

import SWRegister from "@/components/SWRegister"; // Added
import { GlobalNotificationListener } from "@/components/chat/GlobalNotificationListener";
import { CommandPalette } from "@/components/CommandPalette";
import BackgroundBlobs from "@/components/common/BackgroundBlobs";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

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
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${outfit.variable} ${fraunces.variable}`}>
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
              <BackgroundBlobs />
              <ClubProvider> {/* Wrapped with ClubProvider */}
                <CommandProvider>
                  <EventProvider>
                    <TeamProvider>
                      <Navbar />
                      <main className="container">
                        {children}
                      </main>
                      <FloatingChatButton />
                      <GlobalNotificationListener />
                      <CommandPalette />
                      <Footer />
                      <ToastProvider />
                      <GlobalModal />
                    </TeamProvider>
                  </EventProvider>
                </CommandProvider>
              </ClubProvider> {/* Closing ClubProvider tag */}
            </AuthProvider>
          </ModalProvider>
        </ThemeProvider>
      </body>
    </html >
  );
}
