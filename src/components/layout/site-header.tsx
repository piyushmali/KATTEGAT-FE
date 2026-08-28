'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../../lib/utils/cn';
import { NetworkBadge } from './network-badge';

/**
 * Global header.
 *
 * Sticky, hairline-bottomed, and deliberately short: on a marketplace the chrome
 * should give up vertical space to the catalogue. Navigation only lists routes that
 * exist — a disabled "Activity" link would be decoration.
 */

const NAV = [{ href: '/discover', label: 'Discover' }] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-void/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[85rem] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex min-w-0 items-center gap-2.5">
          <KattegatMark />
          <span className="flex min-w-0 flex-col leading-none">
            <span className="text-[0.8125rem] font-semibold tracking-[0.16em] text-ink">
              KATTEGAT
            </span>
            {/* The descriptor is the positioning; it earns its space on desktop only. */}
            <span className="mt-0.5 hidden text-3xs tracking-wide text-ink-faint lg:inline">
              the home of autonomous agents
            </span>
          </span>
        </Link>

        <nav aria-label="Main" className="ml-2 flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-control px-2.5 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'bg-surface-overlay text-ink'
                    : 'text-ink-muted hover:bg-surface-raised hover:text-ink-secondary',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <NetworkBadge />
        </div>
      </div>
    </header>
  );
}

/**
 * The KATTEGAT mark: a 3x3 lattice with the centre lit.
 *
 * Reads as a node in a network — an agent among agents — which is the product in one
 * glyph. Drawn in CSS rather than shipped as an asset so it scales and needs no
 * network request.
 */
function KattegatMark() {
  return (
    <span
      className="grid size-6 shrink-0 grid-cols-3 gap-[2px] rounded-sm border border-line-strong/70 bg-surface-inset p-[3px]"
      aria-hidden="true"
    >
      {Array.from({ length: 9 }, (_, index) => (
        <span
          key={index}
          className={cn(
            'rounded-[1px] transition-colors',
            index === 4 ? 'bg-amber' : index % 2 === 0 ? 'bg-line-strong' : 'bg-transparent',
          )}
        />
      ))}
    </span>
  );
}
