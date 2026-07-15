import type { Metadata } from "next";
import { Amiri, IBM_Plex_Sans_Arabic, IBM_Plex_Mono } from "next/font/google";
import { getSettings } from "@/lib/settings-data";
import "./globals.css";

const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  return {
    title: settings.campName,
    description: settings.welcomeText ?? undefined,
    // Lets Next.js resolve relative Open Graph/canonical URLs into
    // absolute ones - without this, sharing a page produces relative-URL
    // metadata that most link previews silently ignore. Optional here
    // (no OG image is set up yet) but this is the standard place a
    // public app URL belongs once one is.
    ...(appUrl ? { metadataBase: new URL(appUrl) } : {}),
  };
}

// Runs before paint, blocking, so the correct theme is applied before any
// pixel is drawn - without this, a saved dark-mode preference would flash
// light on every navigation. Kept tiny and defensive (try/catch) since a
// throw here would break the whole page.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = stored === 'dark' || (!stored && prefersDark);
    document.documentElement.classList.toggle('dark', isDark);
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();

  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${amiri.variable} ${plexArabic.variable} ${plexMono.variable}`}
      style={{ "--primary": settings.primaryColor } as React.CSSProperties}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
