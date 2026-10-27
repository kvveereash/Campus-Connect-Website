import { Inter, Bricolage_Grotesque, Geist_Mono, Instrument_Serif, Noto_Sans_Devanagari, Noto_Sans_Tamil } from "next/font/google";

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
export const fontVariables = `${inter.variable} ${bricolage.variable} ${geistMono.variable} ${instrumentSerif.variable} ${notoDevanagari.variable} ${notoTamil.variable}`;
