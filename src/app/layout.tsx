import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import type { ReactNode } from 'react';
import { env } from '../config/env';
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
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

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

const TITLE = 'KATTEGAT · The harbour for intelligent agents';
const DESCRIPTION =
  'Discover, verify and hire autonomous agents on BNB Smart Chain. Agent identity and reputation read directly from the ERC-8004 registries.';

export const metadata: Metadata = {
  /*
   * Required for the social card to work at all. Without it Next resolves Open Graph URLs
   * against localhost, and a shared link renders as bare text.
   */
  metadataBase: new URL(env.siteUrl),
  title: {
    // Used verbatim for the landing page, which sets no title of its own.
    default: TITLE,
    template: '%s · KATTEGAT',
  },
  description: DESCRIPTION,
  applicationName: 'KATTEGAT',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'KATTEGAT',
    title: TITLE,
    description: DESCRIPTION,
    url: '/',
    locale: 'en',
  },
  /*
   * `summary_large_image` now that there is artwork to back it.
   *
   * It was `summary` on purpose while there was none: X and Telegram fall back to a bare link
   * when a large card is declared and the image 404s, so claiming an image the site did not
   * have would have been worse than claiming none.
   *
   * Next resolves both cards from the file convention — `src/app/opengraph-image.jpg` and
   * `twitter-image.jpg` — so there is no URL to keep in sync here, and no way for the declared
   * card to drift from the file that serves it.
   *
   * JPEG rather than PNG, and the 8x is deliberate: the artwork is smooth dark gradient, which
   * PNG stores at 689 KB and JPEG at 80 KB with no banding at card size. A social card is
   * fetched by a crawler on a short timeout, so its weight decides whether the preview appears
   * at all.
   */
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    // The account that publishes KATTEGAT, so a shared link carries attribution.
    site: '@MaatX_xyz',
    creator: '@MaatX_xyz',
  },
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
      <body className="grain min-h-dvh antialiased">
        {children}
        {/*
         * Traffic measurement, and the reason it is here for launch rather than after it: the
         * campaign asks whether this can handle the load, and that is not answerable from an
         * uptime ping. A ping says the process is alive; this says whether anyone arrived, which
         * page they opened, and whether they came back.
         *
         * Last in the body so it cannot delay first paint, and it self-disables outside
         * production — no dev traffic in the numbers, and no request at all on localhost.
         *
         * Cookieless and collects no personal data, which is what makes it acceptable on a
         * product whose argument is that it only reports what it can evidence. Nothing here
         * identifies a visitor, so there is nothing to disclose that the page does not already.
         */}
        <Analytics />
      </body>
    </html>
  );
}
