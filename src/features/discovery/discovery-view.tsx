'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  AgentGridSkeleton,
  EmptyState,
  ErrorState,
  InlineSpinner,
} from '../../components/ui/states';
import { AgentCard } from '../agents/agent-card';
import { ApiError, describeError } from '../../lib/api/errors';
import { isMockMode } from '../../config/env';
import { AgentFilters } from './agent-filters';
import { useAgents, useCategories } from './use-agents';
import { useDebouncedValue } from './use-debounced-value';
import { useDiscoveryParams } from './use-discovery-params';

/**
 * The discovery surface.
 *
 * Filter state lives in the URL (see use-discovery-params), so a search is
 * shareable and the back button works. The search input keeps its own local value so
 * typing stays instant, and only the debounced value is pushed to the URL — writing
 * every keystroke to history would make back navigation useless.
 *
 * Every state the data layer can produce is rendered explicitly, and the distinction
 * between "nothing indexed" and "nothing matches these filters" is preserved because
 * the fix differs: run a sync versus clear a filter.
 */
export function DiscoveryView() {
  const { state, update, clear, toggleTrait, hasFilters, queryParams } = useDiscoveryParams();
  const categoriesQuery = useCategories();
  const agentsQuery = useAgents(queryParams);

  /*
   * The search field keeps a local draft so typing is instant, while the URL stays the
   * source of truth for the actual query. Only the settled value is pushed, because
   * writing every keystroke to history would make the back button useless.
   */
  const [draft, setDraft] = useState(state.q);
  const debounced = useDebouncedValue(draft, 320);

  /*
   * Re-sync the field when the URL changes from outside the input — back/forward
   * navigation, or "clear filters".
   *
   * Adjusted during render by comparing against the last URL value we saw, which is
   * React's documented pattern for this. Doing it in an effect would trigger a
   * cascading re-render (and `react-hooks/set-state-in-effect` rightly flags it).
   */
  const [lastUrlQuery, setLastUrlQuery] = useState(state.q);
  if (state.q !== lastUrlQuery) {
    setLastUrlQuery(state.q);
    setDraft(state.q);
  }

  // Publishing the settled draft is a navigation, not a state update, so it belongs
  // in an effect.
  useEffect(() => {
    if (debounced !== state.q) update({ q: debounced });
    // Intentionally keyed on the debounced value alone: this must fire when typing
    // settles, not when the URL changes underneath.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const meta = agentsQuery.data?.meta;
  const agents = agentsQuery.data?.data ?? [];

  return (
    <div className="space-y-5">
      {isMockMode ? (
        <div
          role="status"
          className="rounded-control border border-caution/30 bg-caution-wash/15 px-3 py-2 text-2xs text-caution"
        >
          Mock data source — these agents are fixtures, not live ERC-8004 registry data.
        </div>
      ) : null}

      {/* -------------------------------- search ------------------------------- */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-faint"
          aria-hidden="true"
        />
        <input
          type="search"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          placeholder="Search by name, capability or what you need done"
          aria-label="Search agents"
          className="h-11 w-full rounded-card border border-line bg-surface-inset pr-10 pl-10 text-sm text-ink placeholder:text-ink-faint focus:border-amber-dim focus:bg-surface-raised focus:outline-none"
        />
        {draft.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setDraft('');
            }}
            aria-label="Clear search"
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-sm p-1 text-ink-faint transition-colors hover:text-ink"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <AgentFilters
        state={state}
        categories={categoriesQuery.data?.data}
        totalForQuery={meta?.total}
        hasFilters={hasFilters}
        onUpdate={update}
        onToggleTrait={toggleTrait}
        onClear={() => {
          setDraft('');
          clear();
        }}
      />

      {/* ------------------------------- results ------------------------------ */}
      <div className="flex min-h-5 items-center justify-end">
        {/* Distinguishes a background refetch from a first load. */}
        {agentsQuery.isFetching && !agentsQuery.isLoading ? (
          <InlineSpinner label="Updating" />
        ) : null}
      </div>

      {agentsQuery.isLoading ? (
        <AgentGridSkeleton count={9} />
      ) : agentsQuery.isError ? (
        <ErrorState
          {...describeError(agentsQuery.error)}
          upstream={
            agentsQuery.error instanceof ApiError &&
            (agentsQuery.error.code === 'UPSTREAM_UNAVAILABLE' ||
              agentsQuery.error.code === 'NETWORK_ERROR')
          }
          requestId={agentsQuery.error instanceof ApiError ? agentsQuery.error.requestId : null}
          onRetry={() => {
            void agentsQuery.refetch();
          }}
        />
      ) : agents.length === 0 ? (
        hasFilters ? (
          <EmptyState
            title="No agents match these filters"
            description="Nothing in the index matches that combination. Try a broader category, a different search term, or clear the filters."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setDraft('');
                  clear();
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          // An empty index is an operations problem, not a user one. Say which.
          <EmptyState
            title="No agents indexed yet"
            description="The marketplace is connected to the API but the catalogue is empty. Run an ingestion pass on the backend to index agents from the ERC-8004 registry."
          />
        )
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard key={agent.identity.id} agent={agent} />
            ))}
          </div>

          {meta && meta.totalPages > 1 ? (
            <nav
              className="flex items-center justify-between gap-4 border-t border-line pt-4"
              aria-label="Agent pagination"
            >
              <Button
                variant="secondary"
                size="sm"
                disabled={state.page <= 1}
                onClick={() => {
                  update({ page: Math.max(1, state.page - 1) });
                }}
              >
                <ChevronLeft className="size-3.5" aria-hidden="true" />
                Previous
              </Button>
              <span className="tabular text-2xs text-ink-muted">
                Page {meta.page.toLocaleString()} of {meta.totalPages.toLocaleString()}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={state.page >= meta.totalPages}
                onClick={() => {
                  update({ page: state.page + 1 });
                }}
              >
                Next
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </Button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
