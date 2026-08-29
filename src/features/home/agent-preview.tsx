'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';
import { AgentAvatar } from '../../components/ui/agent-avatar';
import { Skeleton } from '../../components/ui/states';
import { CATEGORY_LABELS } from '../../lib/api/contract';
import { useAgents } from '../discovery/use-agents';

/**
 * A live sample of the index, on the landing page.
 *
 * This replaces what would otherwise be an empty hero column, and it earns the space
 * by being real: these are the most recently registered agents, fetched from the same
 * endpoint discovery uses. It demonstrates the claim "KATTEGAT indexes a living
 * ecosystem" instead of asserting it over a decorative animation.
 *
 * Classified agents are requested first so the sample shows the product working. It
 * degrades quietly — if the call fails the whole panel is omitted rather than showing
 * a broken frame on the first screen a visitor sees.
 */
export function AgentPreview() {
  const { data, isLoading, isError } = useAgents({
    perPage: 5,
    sort: 'registered_at',
    direction: 'desc',
    resolvedOnly: true,
  });

  if (isError) return null;

  return (
    <div className="lit-edge overflow-hidden rounded-panel border border-line bg-surface-raised">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span
            className="size-1.5 animate-live rounded-pill bg-positive ring-2 ring-positive/20"
            aria-hidden="true"
          />
          <h2 className="eyebrow">Live from the registry</h2>
        </div>
        <Link
          href="/discover"
          className="group inline-flex items-center gap-1.5 text-2xs font-medium text-ink-muted transition-colors hover:text-amber"
        >
          Browse all
          <ArrowRight
            className="size-3 transition-transform duration-300 ease-fjord group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>

      <ul className="divide-y divide-line">
        {isLoading
          ? Array.from({ length: 5 }, (_, index) => (
              <li
                key={index}
                className="flex items-center gap-3.5 px-5 py-4"
                // Staggered to match the agent grid, so both lists load the same way.
                style={{ '--skeleton-delay': `${String(index * 90)}ms` } as CSSProperties}
              >
                <Skeleton className="size-8 rounded-sm" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-2/5" />
                  <Skeleton className="h-2.5 w-3/5" />
                </div>
              </li>
            ))
          : (data?.data ?? []).map((agent) => {
              const primary =
                agent.categories.find((entry) => entry.isPrimary) ?? agent.categories[0];
              const classified = primary && primary.category !== 'uncategorized';

              return (
                <li key={agent.identity.id}>
                  <Link
                    href={`/agents/${encodeURIComponent(agent.identity.id)}`}
                    className="group flex items-center gap-3.5 px-5 py-4 transition-colors duration-300 hover:bg-surface-overlay/50"
                  >
                    <AgentAvatar
                      agentId={agent.identity.id}
                      name={agent.profile.name}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      {/* Serif name, matching the card — one agent, one treatment. */}
                      <p className="display truncate text-sm text-ink transition-colors duration-300 group-hover:text-amber-bright">
                        {agent.profile.name}
                      </p>
                      <p className="mt-1 truncate text-3xs text-ink-faint">
                        {agent.profile.description ?? 'No description published'}
                      </p>
                    </div>
                    {classified ? (
                      <span className="eyebrow hidden shrink-0 text-amber/70 sm:inline">
                        {CATEGORY_LABELS[primary.category]}
                      </span>
                    ) : (
                      <span className="hidden shrink-0 font-mono text-3xs text-ink-faint sm:inline">
                        #{agent.identity.agentId}
                      </span>
                    )}
                    <ArrowRight
                      className="hidden size-3 shrink-0 text-line-strong transition-all duration-300 ease-fjord group-hover:translate-x-0.5 group-hover:text-amber sm:block"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
      </ul>
    </div>
  );
}
