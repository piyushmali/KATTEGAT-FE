'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { AgentImage } from '../../components/ui/agent-image';
import { Skeleton } from '../../components/ui/states';
import { CATEGORY_LABELS } from '../../lib/api/contract';
import { firstSentence, formatDate } from '../../lib/utils/format';
import { useAgents } from '../discovery/use-agents';

/**
 * A live sample of the index, on the landing page.
 *
 * It earns its space by being real: the most recently registered agents, from the same
 * endpoint discovery uses. That demonstrates "KATTEGAT indexes a living ecosystem"
 * rather than asserting it over a decorative animation.
 *
 * LAYOUT
 *
 * A register, not a widget. The earlier version was a narrow bordered panel with its own
 * header bar and a stack of cramped two-line rows, which read as a sidebar module that
 * had wandered into the page. At full width the rows can hold their columns instead:
 * artwork, name, what it does, category, when it arrived, all aligned down the page so
 * the eye can scan one column at a time.
 *
 * The panel chrome is gone entirely. The section heading above it already says what this
 * is, and a second header inside the box was saying it twice.
 *
 * Degrades quietly: if the call fails the whole block is omitted rather than putting a
 * broken frame on the first screen a visitor sees.
 */
export function AgentPreview() {
  const { data, isLoading, isError } = useAgents({
    perPage: 6,
    sort: 'registered_at',
    direction: 'desc',
    resolvedOnly: true,
    /*
     * Matters most here, on the first screen anyone sees. One registration file is shared by
     * 117,564 agent ids and declares no endpoint, and because it resolves instantly while
     * genuinely new agents wait on the metadata backlog, newest-first showed the same name in
     * all six slots. Requiring an endpoint makes these six six different agents, and ones a
     * visitor could actually hire.
     */
    hasEndpoint: true,
  });

  if (isError) return null;

  return (
    <div>
      <ul className="divide-y divide-line border-y border-line">
        {isLoading
          ? Array.from({ length: 6 }, (_, index) => (
              <li
                key={index}
                className="flex items-center gap-4 py-4"
                // Staggered to match the agent grid, so both lists load the same way.
                style={{ '--skeleton-delay': `${String(index * 90)}ms` } as CSSProperties}
              >
                <Skeleton className="size-10 rounded-control" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/4" />
                  <Skeleton className="h-2.5 w-2/5" />
                </div>
                <Skeleton className="hidden h-3 w-20 sm:block" />
              </li>
            ))
          : (data?.data ?? []).map((agent) => {
              const primary =
                agent.categories.find((entry) => entry.isPrimary) ?? agent.categories[0];
              const classified = primary && primary.category !== 'uncategorized';
              const registered = formatDate(agent.identity.registeredAt);

              return (
                <li key={agent.identity.id}>
                  <Link
                    href={`/agents/${encodeURIComponent(agent.identity.id)}`}
                    /*
                     * A hairline that lights up on approach, rather than only a fill change.
                     * Six near-identical rows need a hover that says which one is armed, and
                     * a faint background shift on a dark ground is easy to miss — the metal
                     * edge on the left is the same language the lead panels use.
                     */
                    className="group relative flex items-center gap-4 py-5 pl-3.5 transition-colors duration-300 before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-amber-dim before:opacity-0 before:transition-opacity before:duration-300 hover:bg-surface-raised/40 hover:before:opacity-100"
                  >
                    <AgentImage
                      agentId={agent.identity.id}
                      name={agent.profile.name}
                      imageUrl={agent.profile.imageUrl}
                      size="md"
                      className="ml-0.5"
                    />

                    {/*
                     * Name and description share a column but not a line. Many projects
                     * register hundreds of agents under one name, so the description is
                     * what actually distinguishes two adjacent rows.
                     */}
                    <div className="min-w-0 flex-1">
                      <p className="display truncate text-base text-ink transition-colors duration-300 group-hover:text-amber-bright">
                        {agent.profile.name}
                      </p>
                      {/*
                       * First sentence, then clamp as a safety net.
                       *
                       * These are operator-written and frequently run on for two or three
                       * sentences, so a plain `truncate` ended every row on a severed word —
                       * "for PancakeSwap concentra…". A clipped word reads as a rendering
                       * fault; a complete sentence reads as an edit.
                       */}
                      <p className="mt-1.5 truncate text-xs text-ink-muted">
                        {agent.profile.description === null
                          ? 'No description published'
                          : firstSentence(agent.profile.description)}
                      </p>
                    </div>

                    {/*
                     * Fixed-width so the column aligns rather than ragging by label.
                     *
                     * An unclassified agent reads "Unclassified" in faint ink rather than a blank
                     * cell. The blank looked like a rendering fault — a row that had lost its
                     * category — when the truth is that KATTEGAT could not confidently place the
                     * agent and says so. Same amber label for a real category, same honest word
                     * for the absence, so the column never has an unexplained hole in it.
                     */}
                    <span
                      className={
                        classified
                          ? 'eyebrow hidden w-36 shrink-0 text-right text-amber/75 lg:block'
                          : 'eyebrow hidden w-36 shrink-0 text-right text-ink-faint lg:block'
                      }
                    >
                      {classified ? CATEGORY_LABELS[primary.category] : 'Unclassified'}
                    </span>

                    <span className="tabular hidden w-24 shrink-0 text-right text-2xs text-ink-faint sm:block">
                      {registered ?? `#${String(agent.identity.agentId)}`}
                    </span>

                    <ArrowUpRight
                      className="hidden size-3.5 shrink-0 text-line-strong transition-colors duration-300 group-hover:text-amber sm:block"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
      </ul>

      <div className="mt-6">
        <Link
          href="/discover"
          className="group inline-flex items-center gap-2 text-xs font-medium text-ink-secondary transition-colors hover:text-amber"
        >
          <span className="relative">
            Browse all agents
            <span
              className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-amber-dim transition-transform duration-500 ease-fjord group-hover:scale-x-100"
              aria-hidden="true"
            />
          </span>
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
