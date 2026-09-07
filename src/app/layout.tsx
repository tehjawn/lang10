import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { Motion } from "@/components/motion-provider";
import { ProgressProvider } from "@/lib/store";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Lang10 — Ten Japanese words a day",
  description:
    "Learn Japanese ten items at a time. Spaced repetition, streaks, and audio — in your browser, with or without an account.",
  applicationName: "Lang10",
  appleWebApp: { capable: true, title: "Lang10", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfbf7" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={nunito.variable}>
      <head>
        {/*
          Zen Maru Gothic is loaded from Google rather than next/font: next/font
          only exposes this family's latin subsets, which would silently drop
          every kana and kanji. Google's stylesheet is unicode-range split, so
          the browser fetches only the handful of chunks the deck actually uses.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/*
          eslint-disable-next-line @next/next/no-page-custom-font --
          That rule targets the pages router, where a per-page <head> would load
          the font for one route only. This is the App Router root layout, so
          the stylesheet applies to every page exactly as intended.
        */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700&display=swap"
        />
      </head>
      <body className="font-sans antialiased">
        <Motion>
          <ProgressProvider>
            <AppShell>{children}</AppShell>
          </ProgressProvider>
        </Motion>
      </body>
    </html>
  );
}
