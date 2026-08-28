import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';
import type { ReactNode } from 'react';
import '../styles/globals.css';

/**
 * Root layout: the document shell, fonts and global stylesheet.
 *
 * Providers and chrome deliberately live one level down, in the `(site)` route
 * group layout, so this file stays renderable on its own. That keeps the root
 * not-found (and anything else that renders outside the app shell) free of the
 * wallet and query providers it has no use for. A route group adds no URL
 * segment, so `/`, `/discover` and `/agents/[id]` keep their paths.
 */

// Self-hosted by Next at build time; no runtime request to Google.
const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });

/**
 * The display voice, used for monumental headlines and nothing else.
 *
 * Instrument Serif ships one weight and a true italic — no bold, no variable axis.
 * That constraint is the reason to choose it here: high-contrast serifs are meant to
 * be scaled rather than emboldened, and having no bold available means a headline can
 * only gain weight by getting larger, which is the behaviour the art direction wants.
 *
 * `preload` is left on because the hero headline is the largest thing above the fold
 * and a swap there would be the most visible layout shift on the site.
 */
const instrumentSerif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    // Used verbatim for the landing page, which sets no title of its own.
    default: 'KATTEGAT — the harbour for intelligent agents',
    template: '%s · KATTEGAT',
  },
  description:
    'Discover, verify and hire autonomous agents on BNB Smart Chain. Agent identity and reputation read directly from the ERC-8004 registries.',
  applicationName: 'KATTEGAT',
};

export const viewport: Viewport = {
  /*
   * The sRGB rendering of --color-void, so mobile browser chrome continues the page
   * instead of framing it. Kept honest by styles/palette.test.ts, which converts the
   * token and asserts this hex still matches it — the two drifted before.
   */
  themeColor: '#03080e',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
    >
      {/*
       * `grain` puts a single static noise tile over the whole document. It is what
       * keeps large areas of near-black from banding, and it gives every surface a
       * faint tooth so the interface reads as a material rather than a colour value.
       */}
      <body className="grain min-h-dvh antialiased">{children}</body>
    </html>
  );
}
