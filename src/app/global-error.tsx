'use client';

import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
            <body className="flex items-center justify-center min-h-screen bg-slate-950 text-white">
                <div className="text-center p-8 max-w-lg">
                    <h1 className="text-4xl font-bold mb-4 text-red-500">System Error</h1>
                    <p className="text-slate-400 mb-8">
                        The application encountered a critical error. We apologize for the inconvenience.
                    </p>
                    <button
                        onClick={() => reset()}
                        className="bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-slate-200 transition-colors"
                    >
                        Reload Application
                    </button>
                </div>
            </body>
        </html>
    );
}
