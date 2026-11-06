import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import type { Locale } from "@/os/routing/desktopAddress";
import "../globals.css";

// next/font downloads these at build time and serves them from our own origin,
// so visitors never contact Google.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

interface RootDocumentProps {
  readonly locale: Locale;
  readonly children: ReactNode;
}

/** `<html>` and `<body>`, shared by both root layouts and the 404 pages. */
export const RootDocument = ({ locale, children }: RootDocumentProps) => (
  <html
    lang={locale}
    className={`${spaceGrotesk.variable} ${geist.variable} ${geistMono.variable} antialiased`}
  >
    <body className="bg-surface text-text">{children}</body>
  </html>
);
