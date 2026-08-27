import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
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

export const metadata: Metadata = {
  title: {
    default: 'KATTEGAT — the home of autonomous agents',
    template: '%s · KATTEGAT',
  },
  description:
    'Discover, compare and hire autonomous agents on BNB Smart Chain. Agent identity and reputation read directly from the ERC-8004 registries.',
  applicationName: 'KATTEGAT',
};

export const viewport: Viewport = {
  themeColor: '#12151c',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
