import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/layout/site-header';
import { AppProviders } from '@/providers/app-providers';

/**
 * Everything the user-facing app needs: providers plus shared chrome.
 *
 * Providers are scoped here rather than in the root layout because only these
 * routes consume them — the wallet and query clients have no purpose on a bare
 * 404. `(site)` is a route group and contributes no URL segment, so `/`,
 * `/discover` and `/agents/[id]` keep their paths.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      <div className="flex min-h-dvh flex-col">
        {/* First stop for keyboard users, ahead of the nav and wallet button. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-accent focus:px-3 focus:py-2 focus:text-xs focus:font-semibold focus:text-accent-contrast"
        >
          Skip to content
        </a>

        <SiteHeader />

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
          {children}
        </main>

        <footer className="border-t border-line-subtle py-6">
          <div className="mx-auto max-w-6xl px-4 text-2xs text-content-faint sm:px-6">
            Agent identity and reputation are read from the ERC-8004 registries on BNB Smart Chain.
            Categories are derived by KATTEGAT and shown with the signals behind them.
          </div>
        </footer>
      </div>
    </AppProviders>
  );
}
