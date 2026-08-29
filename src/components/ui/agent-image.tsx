'use client';

import { useState } from 'react';
import { AgentAvatar } from './agent-avatar';
import { cn } from '../../lib/utils/cn';

/**
 * An agent's own artwork, with the generated identity mark as its fallback.
 *
 * 95.5% of agents with resolved metadata publish an `image` in their registration file,
 * so this is what makes the marketplace look like a marketplace rather than a table of
 * hashes. It is also real: the artwork is the agent's own, named on chain, not something
 * KATTEGAT invented for it.
 *
 * WHY NOT `next/image`
 *
 * The URLs point at hundreds of third-party origins — iconaves.com, evoevo.ai, Cloudflare
 * workers, dicebear, and a long tail. `next/image` requires every remote host to be
 * declared in `remotePatterns`, so it would either need a list nobody can keep current or
 * a wildcard that turns our server into an open image proxy for arbitrary on-chain URLs.
 * A plain `img` is the honest primitive here, and native `loading="lazy"` covers what
 * mattered most about `next/image` for a grid.
 *
 * FAILING WELL IS THE POINT
 *
 * These hosts belong to other people and some are already gone. A broken image must never
 * leave a hole in the grid, so any load error falls back to the deterministic mark — which
 * means every agent has a visual identity whether or not its host is up.
 */
export function AgentImage({
  agentId,
  name,
  imageUrl,
  size = 'md',
  className,
}: {
  agentId: string;
  name?: string;
  imageUrl: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (imageUrl === null || failed) {
    /*
     * Props are spread conditionally because `exactOptionalPropertyTypes` distinguishes
     * "absent" from "present and undefined", and the fallback declares these optional.
     */
    return (
      <AgentAvatar
        agentId={agentId}
        size={size}
        {...(name === undefined ? {} : { name })}
        {...(className === undefined ? {} : { className })}
      />
    );
  }

  const box = {
    sm: 'size-8 rounded-sm',
    md: 'size-10 rounded-control',
    lg: 'size-14 rounded-card',
    xl: 'size-20 rounded-panel',
  }[size];

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden border border-line-strong/60 bg-surface-inset',
        box,
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- third-party host, see above */}
      <img
        src={imageUrl}
        alt={name ? `${name} artwork` : 'Agent artwork'}
        loading="lazy"
        decoding="async"
        /*
         * `no-referrer` so browsing the marketplace does not leak which agent a visitor is
         * looking at to whichever third party hosts its artwork.
         */
        referrerPolicy="no-referrer"
        className="size-full object-cover"
        onError={() => {
          setFailed(true);
        }}
      />

      {/* Matches the mark's struck edge, so real artwork and a fallback sit alike. */}
      <div
        className="absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-ink/8"
        aria-hidden="true"
      />
    </div>
  );
}
