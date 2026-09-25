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
 * The KATTEGAT mark: a harbour beacon inside a compass rose.
 *
 * Replaces a 3x3 lattice that read as a network node. The lattice was a reasonable glyph for
 * "an agent among agents", but it was not the identity: the brand kit is a lighthouse, and that
 * is the mark going onto BNB Chain's launch material. A visitor arriving from a post carrying
 * the lighthouse and finding a lattice in the header has been given two logos for one product.
 *
 * Deliberately the same geometry as `src/app/icon.svg`. They are two copies rather than one
 * source because Next resolves the favicon from a file at a fixed path and cannot read a React
 * component — so if either changes, change both. The shapes are kept simple enough to survive
 * 16px in a browser tab, which also makes them safe at the 24px this renders at.
 *
 * `currentColor` throughout, so the hover warming survives in one place: the group sets the
 * text colour and every shape follows. A logo that animates on a marketplace is a distraction
 * from the catalogue, so warming is all it does.
 */
function KattegatMark() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="size-6 shrink-0 text-amber-dim transition-colors duration-500 ease-fjord group-hover:text-amber"
      fill="none"
      aria-hidden="true"
    >
      {/* Compass points, extending past the ring so the silhouette is not a plain circle. */}
      <g fill="currentColor">
        <path d="M32 3 33.5 24 32 27 30.5 24Z" />
        <path d="M32 61 33.5 40 32 37 30.5 40Z" />
        <path d="M3 32 24 30.5 27 32 24 33.5Z" />
        <path d="M61 32 40 30.5 37 32 40 33.5Z" />
      </g>

      <circle cx="32" cy="32" r="21" stroke="currentColor" strokeWidth="2.4" />

      {/* Beacon: lamp, tapered tower, base. */}
      <g fill="currentColor">
        <circle cx="32" cy="20.5" r="3.1" />
        <path d="M29.4 24.5h5.2l2 17.5h-9.2Z" />
        <rect x="25.4" y="42" width="13.2" height="2.6" rx="0.8" />
      </g>

      {/* Water as two bars. At this size a drawn wave becomes noise. */}
      <g fill="currentColor" opacity="0.78">
        <rect x="20" y="47.4" width="24" height="2.2" rx="1.1" />
        <rect x="25" y="51.6" width="14" height="2" rx="1" />
      </g>
    </svg>
  );
}
