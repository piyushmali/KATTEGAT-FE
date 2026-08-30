'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../../lib/utils/cn';
import { NetworkBadge } from './network-badge';

/**
 * Global header.
 *
 * Immersive rather than framed. There is no solid bar and no hard bottom border: a
 * gradient scrim fades the chrome into whatever is behind it, so over the hero the
 * navigation reads as part of the environment. The blur stays, because it is what keeps
 * the wordmark legible once real content scrolls underneath — dropping it would trade a
 * genuine readability guarantee for a small aesthetic gain.
 *
 * Navigation only lists routes that exist. A disabled "Create" or "Dashboard" link
 * would be decoration, and on a product whose entire argument is evidence over
 * marketing, a nav item that goes nowhere is the worst possible first impression.
 */

const NAV = [{ href: '/discover', label: 'Discover' }] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-b from-void via-void/85 to-void/0 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-shell items-center gap-6 px-4 sm:px-6 lg:px-8">
        {/*
         * Wordmark only. A tagline under the logo is a landing-page device, and repeating
         * the positioning statement in the chrome of every page — including the ones where
         * the user is working — makes the header look like an advert for the product they
         * are already inside.
         */}
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <KattegatMark />
          <span className="display text-[0.9375rem] tracking-[0.2em] text-ink">KATTEGAT</span>
        </Link>

        {/* Hairline divider rather than a gap, so the two zones read as deliberate. */}
        <span className="hidden h-4 w-px shrink-0 bg-line sm:block" aria-hidden="true" />

        <nav aria-label="Main" className="flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative px-1 py-1.5 text-2xs font-medium tracking-[0.14em] uppercase transition-colors duration-200',
                  active ? 'text-ink' : 'text-ink-muted hover:text-ink',
                )}
              >
                {item.label}
                {/*
                 * A rule that draws itself on hover and stays drawn on the current
                 * page. Carries the same information a filled pill did, with far less
                 * furniture — and `aria-current` is what actually announces it.
                 */}
                <span
                  className={cn(
                    'absolute -bottom-0.5 left-0 h-px w-full origin-left bg-amber transition-transform duration-500 ease-fjord',
                    active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                  )}
                  aria-hidden="true"
                />
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
 * glyph. Drawn in CSS rather than shipped as an asset so it scales and needs no network
 * request. The lit centre warms on hover, which is the only thing the mark does; a
 * logo that animates on a marketplace is a distraction from the catalogue.
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
            'rounded-[1px] transition-colors duration-500 ease-fjord',
            index === 4
              ? 'bg-amber-dim group-hover:bg-amber'
              : index % 2 === 0
                ? 'bg-line-strong'
                : 'bg-transparent',
          )}
        />
      ))}
    </span>
  );
}
