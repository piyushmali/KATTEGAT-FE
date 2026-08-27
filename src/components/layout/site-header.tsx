import Link from 'next/link';
import { ConnectButton } from '../../features/wallet/connect-button';

/**
 * Global header. Sticky so the wallet state and navigation stay reachable while
 * scrolling a long agent list.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line-subtle bg-surface-base/85 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-sm font-bold tracking-[0.2em] text-content-primary">
              KATTEGAT
            </span>
            <span className="hidden text-2xs text-content-faint sm:inline">
              the home of autonomous agents
            </span>
          </Link>

          <nav aria-label="Main" className="hidden sm:block">
            <Link
              href="/discover"
              className="text-xs font-medium text-content-secondary transition-colors hover:text-content-primary"
            >
              Discover
            </Link>
          </nav>
        </div>

        <ConnectButton />
      </div>
    </header>
  );
}
