'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Skeleton } from '../../components/ui/states';
import { displayCategory } from '../../lib/api/contract';
import { formatCount } from '../../lib/utils/format';
import { useAgents, useStats } from '../discovery/use-agents';

/**
 * The hero's right-hand anchor: the harbour's manifest of arrivals.
 *
 * WHY THIS EXISTS
 *
 * The fold was a headline, a paragraph, two actions and then a great deal of black. The
 * composition was fine and the page still read as a document about a marketplace rather
 * than a marketplace, because nothing in the first viewport was actually happening. A
 * hero can be given weight on the right with an illustration, and that would have been the
 * wrong answer twice over: decoration in the one place the product has real material, and a
 * second thing competing with the headline for the same job.
 *
 * So the anchor is the index itself. Five agents that registered most recently, named, with
 * their on-chain ids — the same list the Arrivals section shows further down, arriving at
 * the top of the page where it does the most work. It is the difference between claiming
 * 325,546 agents are indexed and showing the last five to walk in.
 *
 * WHY IT COSTS NOTHING
 *
 * The query parameters are identical to `AgentPreview`'s, deliberately and fragilely so:
 * `agentKeys.list` keys on the params object, so matching them exactly means TanStack Query
 * serves both from one cache entry and the fold gains a live panel for zero extra requests.
 * Change one value here and the page silently starts making two calls for the same data.
 *
 * SET LIKE AN INSTRUMENT, NOT A CARD
 *
 * Hairline rows, monospace ids, one lit edge along the top, and a single pulse on the
 * header. It should read as a plate bolted to the wall of a harbour office — which is the
 * register the whole product is written in — rather than as a widget floating over the art.
 */

/** Kept in step with `AgentPreview` on purpose. See the note above. */
const ARRIVALS_QUERY = {
  perPage: 6,
  sort: 'registered_at',
  direction: 'desc',
  resolvedOnly: true,
  hasEndpoint: true,
} as const;

/** Five rows fit the fold at every height worth designing for; the sixth is the shared cache's. */
const ROWS = 5;

export function HarbourManifest() {
  const { data, isLoading, isError } = useAgents(ARRIVALS_QUERY);
  const stats = useStats();

  /*
   * Never a blocker on the fold. A failed arrivals call means the hero is a headline and a
   * waterline, which is what it was before this existed — not a broken panel.
   */
  if (isError) return null;

  const agents = (data?.data ?? []).slice(0, ROWS);

  return (
    <aside
      aria-labelledby="manifest-heading"
      className="lit-edge rounded-panel border border-line bg-surface-inset/70 shadow-cast"
    >
      <div className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-3">
        <h2 id="manifest-heading" className="eyebrow flex items-center gap-2">
          {/*
           * The one pulse in the fold. `animate-live` breathes a ring outward roughly every
           * two and a half seconds, which is slow enough to register as a status light and
           * not as an animation asking to be watched.
           */}
          <span
            className="animate-live size-1 rounded-pill bg-positive"
            aria-hidden="true"
          />
          Arriving
        </h2>
        <span className="text-3xs text-ink-faint">Newest first</span>
      </div>

      <ol className="divide-y divide-line">
        {isLoading
          ? Array.from({ length: ROWS }, (_, index) => (
              <li
                key={index}
                className="px-4 py-2.5"
                // Staggered like every other loading surface, so the page loads one way.
                style={{ '--skeleton-delay': `${String(index * 90)}ms` } as React.CSSProperties}
              >
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="mt-2 h-2 w-2/5" />
              </li>
            ))
          : agents.map((agent) => {
              const { label: categoryLabel } = displayCategory(agent.categories);

              return (
                <li key={agent.identity.id}>
                  <Link
                    href={`/agents/${encodeURIComponent(agent.identity.id)}`}
                    /*
                     * The metal edge on the left is the product's hover signature — the same
                     * mark the arrivals rows and the lead panels use — so a pointer moving
                     * down this list gets the same feedback it gets everywhere else.
                     */
                    className="group relative block px-4 py-2.5 pl-4 transition-colors duration-300 before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-amber-dim before:opacity-0 before:transition-opacity before:duration-300 hover:bg-surface-raised/60 hover:before:opacity-100"
                  >
                    <span className="flex items-baseline gap-2">
                      <span className="display truncate text-sm text-ink transition-colors duration-300 group-hover:text-amber-bright">
                        {agent.profile.name}
                      </span>
                      <ArrowUpRight
                        className="size-2.5 shrink-0 text-line-strong transition-colors duration-300 group-hover:text-amber"
                        aria-hidden="true"
                      />
                    </span>
                    {/*
                     * The label always renders. An unclassified agent reads "Unclassified" rather
                     * than stopping after the id — a row ending mid-line while its neighbours
                     * carried a category read as data that had failed to load, when the truth is
                     * that KATTEGAT could not confidently place the agent.
                     */}
                    <span className="mt-1 flex items-center gap-1.5 text-3xs text-ink-faint">
                      <span className="tabular font-mono">#{agent.identity.agentId}</span>
                      <span className="text-line-strong" aria-hidden="true">
                        /
                      </span>
                      <span className="truncate">{categoryLabel}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
      </ol>

      {/*
       * The denominator, so five rows cannot be mistaken for the size of the index. Reads
       * from the same stats cache the strip below the headline uses.
       */}
      <div className="flex items-baseline justify-between gap-3 border-t border-line px-4 py-3">
        <span className="text-3xs text-ink-faint">of the index</span>
        {stats.data ? (
          <span className="display tabular text-sm text-ink-secondary">
            {formatCount(stats.data.indexedAgents)}
          </span>
        ) : (
          <Skeleton className="h-3 w-16" />
        )}
      </div>
    </aside>
  );
}
