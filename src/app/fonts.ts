import { Geist_Mono, Instrument_Serif, Noto_Sans_Devanagari, Noto_Sans_Tamil } from "next/font/google";
import localFont from "next/font/local";

// Three faces, each with one job. Switzer carries reading text and controls.
// Geist Serif, in its Triangle cut (triangles over the i and the G), is the
// display voice: a poster serif with enough character to sound like students
// rather than a bank. Geist Mono is for labels, dates and counts: the small
// print of a noticeboard.
// Switzer, a variable grotesk (100-900) from the Indian Type Foundry. Its
// licence forbids publishing the file in a public repository, so it is
// fetched from Fontshare before each build (scripts/fetch-fonts.mjs).
const switzer = localFont({
  src: "./fonts/switzer/Switzer-Variable.woff2",
  weight: "100 900",
  variable: "--font-switzer",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
  adjustFontFallback: "Arial",
});
// Geist Serif ships in one weight. It is declared for 400-900 so a heading
// set at 600 or 700 uses the real letters instead of a smeared, synthesised
// bold. From Vercel's `geist` package, under the SIL Open Font License
// (fonts/GeistSerif-OFL.txt).
const geistSerif = localFont({
  src: "./fonts/GeistSerif-Triangle.woff2",
  weight: "400 900",
  variable: "--font-geist-serif",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: "Times New Roman",
});
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
// The accent: a serif italic for the odd word that should sound spoken, set
// against the upright headline the way a poster mixes a headline with a hand
// note.
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

// Hindi and Tamil script, for readers who switch the interface language.
// Not preloaded: their unicode-range means a browser only downloads them when
// a page actually shows Devanagari or Tamil text.
const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-noto-devanagari",
  display: "swap",
  preload: false,
});
const notoTamil = Noto_Sans_Tamil({ subsets: ["tamil"], variable: "--font-noto-tamil", display: "swap", preload: false });

/** For <html className>: the root layout and global-error, which replaces it. */
export const fontVariables = `${switzer.variable} ${geistSerif.variable} ${geistMono.variable} ${instrumentSerif.variable} ${notoDevanagari.variable} ${notoTamil.variable}`;
