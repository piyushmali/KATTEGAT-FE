'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, CircleCheck, Layers } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { AgentGridSkeleton, EmptyState, ErrorState } from '../../components/ui/states';
import { AgentCard } from '../agents/agent-card';
import { ApiError, describeError } from '../../lib/api/errors';
import { formatCount } from '../../lib/utils/format';
import { LAUNCH_CATEGORIES, type AgentCategoryId } from '../../lib/api/contract';
import { useAgents, useCategories } from '../discovery/use-agents';
import { guidanceFor } from './category-guidance';

/**
 * A category, given a page of its own.
 *
 * The marketplace is judged on whether all four launch categories are "surfaced with equal
 * depth", and on whether a visitor can "make a genuinely informed call on which agent to
 * hire". A filter chip on a shared grid does neither: it answers "which agents are tagged
 * this way" and stops, leaving the visitor to work out what the category even means and
 * what separates a good agent in it from a bad one.
 *
 * So each category gets the same page, with the same four parts: what the job is, why
 * anyone hires it out, what to verify before trusting an agent with it, and then the agents
 * themselves. The structure is identical across categories by design. A page that went
 * deeper on Grid Trading than on Health Factor Monitoring would be making a strategy
 * recommendation by layout, which is not ours to make.
 *
 * Ranked by feedback rather than by recency, because this is a hiring surface rather than a
 * newsfeed. An agent with a record should be the first thing seen; `nulls last` keeps the
 * unrated ones below without hiding them.
 */
export function CategoryView({ id }: { id: AgentCategoryId }) {
  const categoriesQuery = useCategories();
  const agentsQuery = useAgents({
    category: id,
    perPage: 24,
    sort: 'feedback',
    direction: 'desc',
    // Complete records only, same default as /discover: a page of blank cards helps nobody.
    resolvedOnly: true,
  });

  const category = categoriesQuery.data?.data.find((entry) => entry.id === id);
  const guidance = guidanceFor(id);
  const isLaunch = (LAUNCH_CATEGORIES as readonly string[]).includes(id);

  return (
    <div>
      {/* ------------------------------- header ------------------------------- */}
      <section className="relative isolate overflow-hidden border-b border-line">
        <div className="fog pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div
          className="grid-field pointer-events-none absolute inset-0 opacity-20"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-shell px-4 pt-8 pb-12 sm:px-6 lg:px-8 lg:pb-16">
          <Link
            href="/discover"
            className="group inline-flex items-center gap-2 text-2xs tracking-[0.08em] text-ink-muted uppercase transition-colors hover:text-ink"
          >
            <ArrowLeft
              className="size-3.5 transition-transform duration-300 ease-fjord group-hover:-translate-x-1"
              aria-hidden="true"
            />
            All categories
          </Link>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_minmax(0,0.9fr)] lg:gap-16">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="eyebrow text-amber/80">
                  {isLaunch ? 'Agent Studio category' : 'Category'}
                </p>
                {category ? (
                  <Badge tone="neutral">
                    {formatCount(category.agentCount)}{' '}
                    {category.agentCount === 1 ? 'agent' : 'agents'}
                  </Badge>
                ) : null}
              </div>

              <h1 className="display mt-3 text-display-lg text-ink">
                {category?.label ?? 'Category'}
              </h1>

              <p className="mt-5 max-w-reading text-sm leading-7 text-ink-secondary sm:text-base">
                {guidance?.summary ?? category?.description ?? ''}
              </p>

              {guidance ? (
                <p className="mt-4 max-w-reading text-xs leading-6 text-ink-muted">
                  {guidance.why}
                </p>
              ) : null}

              {guidance ? (
                <div className="mt-7">
                  <p className="eyebrow">Typically touches</p>
                  <ul className="mt-2.5 flex flex-wrap gap-1.5">
                    {guidance.venues.map((venue) => (
                      <li key={venue}>
                        <Badge tone="outline">
                          <Layers className="size-2.5" aria-hidden="true" />
                          {venue}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {/*
             * The checklist, given equal billing with the description rather than tucked
             * below the grid. This is the part that turns a list of agents into a decision:
             * the visitor carries these questions into a profile, where the endpoint, the
             * reputation record and the classification evidence are waiting to answer them.
             */}
            {guidance ? (
              <div className="rounded-panel border border-line bg-surface-raised/60 p-5 sm:p-6">
                <p className="eyebrow">Before you hire one</p>
                <ul className="mt-4 space-y-3.5">
                  {guidance.checks.map((check) => (
                    <li key={check} className="flex gap-2.5">
                      <CircleCheck
                        className="mt-0.5 size-3.5 shrink-0 text-amber/70"
                        aria-hidden="true"
                      />
                      <span className="text-xs leading-6 text-ink-secondary">{check}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 border-t border-line pt-3.5 text-3xs leading-5 text-ink-faint">
                  KATTEGAT does not verify any of these for you. Every answer is on the
                  agent&rsquo;s own profile, read from chain and from its registration file.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* -------------------------------- agents ------------------------------- */}
      <div className="mx-auto max-w-shell px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div>
            <p className="eyebrow">Agents in this category</p>
            <h2 className="display mt-2.5 text-display-sm text-ink">Ranked by track record</h2>
          </div>
          <p className="max-w-sm text-xs leading-6 text-ink-muted">
            Agents with recorded client feedback first, then the rest. Ranking is by evidence
            on chain, never by anything KATTEGAT was paid to show you.
          </p>
        </div>

        <div className="mt-8">
          {agentsQuery.isLoading ? (
            <AgentGridSkeleton count={6} />
          ) : agentsQuery.isError ? (
            <ErrorState
              {...describeError(agentsQuery.error)}
              upstream={
                agentsQuery.error instanceof ApiError &&
                (agentsQuery.error.code === 'UPSTREAM_UNAVAILABLE' ||
                  agentsQuery.error.code === 'NETWORK_ERROR')
              }
              requestId={
                agentsQuery.error instanceof ApiError ? agentsQuery.error.requestId : null
              }
              onRetry={() => {
                void agentsQuery.refetch();
              }}
            />
          ) : (agentsQuery.data?.data.length ?? 0) === 0 ? (
            /*
             * Empty is a real state for a launch category, and it says which kind of empty.
             * "Nothing registered yet" is a fact about BNB Chain; it is not a broken filter,
             * and it must not read like one.
             */
            <EmptyState
              title="No agents indexed in this category yet"
              description="The category is part of the Agent Studio taxonomy, and nothing on BNB Chain has registered against it that KATTEGAT can confidently place. This is a gap in the ecosystem rather than in the filter."
              action={
                <Link
                  href="/discover"
                  className="inline-flex h-9 items-center rounded-control border border-line-strong bg-surface-overlay/70 px-3.5 text-xs font-medium text-ink transition-colors hover:bg-surface-hover"
                >
                  Browse every agent
                </Link>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {(agentsQuery.data?.data ?? []).map((agent) => (
                  <AgentCard key={agent.identity.id} agent={agent} />
                ))}
              </div>

              {(agentsQuery.data?.meta.total ?? 0) > (agentsQuery.data?.data.length ?? 0) ? (
                <div className="mt-8">
                  <Link
                    href={`/discover?category=${encodeURIComponent(id)}&sort=feedback`}
                    className="group inline-flex items-center gap-2 text-xs font-medium text-ink-secondary transition-colors hover:text-amber"
                  >
                    <span className="relative">
                      See all {formatCount(agentsQuery.data?.meta.total ?? 0)} in Discover
                      <span
                        className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-amber-dim transition-transform duration-500 ease-fjord group-hover:scale-x-100"
                        aria-hidden="true"
                      />
                    </span>
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
