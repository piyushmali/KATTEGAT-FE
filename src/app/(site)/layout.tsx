import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { AppProviders } from '@/providers/app-providers';

/**
 * Everything the user-facing app needs: providers plus shared chrome.
 *
 * Providers are scoped here rather than in the root layout because only these routes
 * consume them — the wallet and query clients have no purpose on a bare 404.
 * `(site)` is a route group and contributes no URL segment.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      {/*
       * Scroll reveals are hidden until their observer fires, so without JS they would
       * never appear. This is the no-JS escape hatch — the page renders fully, just
       * without the entrance. `prefers-reduced-motion` has its own override in
       * globals.css, and `Reveal` itself shows immediately where IntersectionObserver
       * is unavailable.
       */}
      <noscript>
        <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
      </noscript>

      <div className="flex min-h-dvh flex-col">
        {/* First focusable element, ahead of the nav and wallet control. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-control focus:bg-amber focus:px-3 focus:py-2 focus:text-xs focus:font-semibold focus:text-amber-ink"
        >
          Skip to content
        </a>

        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </div>
    </AppProviders>
  );
}
