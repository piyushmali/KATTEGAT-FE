'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { AgentGridSkeleton, EmptyState, ErrorState } from '../../components/ui/states';
import { WakingNotice } from '../../components/ui/waking-notice';
import { AgentCard } from '../agents/agent-card';
import { ApiError, describeError } from '../../lib/api/errors';
import { isMockMode } from '../../config/env';
import { formatCount } from '../../lib/utils/format';
import { AgentFilters } from './agent-filters';
import { shouldInterpret } from './reads-as-request';
import { SearchInterpretationPanel } from './search-interpretation';
import { useAgents, useCategories, useSearch } from './use-agents';
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

  /*
   * Two search paths, chosen by how the query reads. A sentence goes to the intent
   * parser, because a substring match against "conservative yield agent with a track
   * record" returns nothing; a keyword stays on the substring match, because intent
   * parsing would only reinterpret a word the user already chose deliberately.
   *
   * Any explicit filter switches back to the list endpoint. The interpreter derives its
   * own category and protocol, so letting both run at once would mean silently
   * overriding a choice the user made by hand.
   */
  const asking = shouldInterpret(state);

  const searchQuery = useSearch(state.q, state.page, asking);

  // The two endpoints return the same envelope, so downstream rendering is unaware.
  const active = asking ? searchQuery : agentsQuery;
  const meta = active.data?.meta;
  const agents = active.data?.data ?? [];
  const interpretation = asking ? searchQuery.data?.meta.interpretation : undefined;

  return (
    <div className="space-y-6">
      {isMockMode ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-control border border-caution/30 bg-caution-wash/15 px-3.5 py-2.5 text-2xs text-caution"
        >
          <span className="size-1 shrink-0 rounded-pill bg-caution" aria-hidden="true" />
          Mock data source. These agents are fixtures, not live ERC-8004 registry data.
        </div>
      ) : null}

      {/* -------------------------------- search ------------------------------- */}
      {/*
       * The primary instrument on this page, so it is given real presence: full width,
       * body-sized text, and a deep inset well that lifts to a raised surface with a
       * warm edge on focus. The group-focus-within colouring moves the icon too, so the
       * whole control responds as one object rather than just gaining an outline.
       */}
      <div className="group relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-faint transition-colors duration-300 group-focus-within:text-amber"
          aria-hidden="true"
        />
        <input
          type="search"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          /*
           * Phrased as an invitation to describe a need, because that is now genuinely
           * supported. Until intent search was wired up this placeholder promised
           * something the substring match could not deliver — "what you need done"
           * against a description index returns nothing for a sentence.
           */
          placeholder="Describe what you need done, or search by name"
          aria-label="Search agents"
          className="h-13 w-full rounded-card border border-line bg-surface-inset pr-11 pl-11 text-sm text-ink transition-[background-color,border-color] duration-300 ease-fjord placeholder:text-ink-faint focus:border-amber-dim/60 focus:bg-surface-raised focus:outline-none sm:text-base"
        />
        {draft.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setDraft('');
            }}
            aria-label="Clear search"
            className="absolute top-1/2 right-3.5 -translate-y-1/2 rounded-sm p-1 text-ink-faint transition-colors hover:text-ink"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {/*
       * Shown above the filters, because it explains the results the user is about to
       * scroll past and offers to become those filters.
       */}
      {interpretation ? (
        <SearchInterpretationPanel
          interpretation={interpretation}
          total={meta?.total}
          onApply={update}
        />
      ) : null}

      <AgentFilters
        state={state}
        categories={categoriesQuery.data?.data}
        totalForQuery={meta?.total}
        // Distinguishes a background refetch from a first load.
        isRefetching={active.isFetching && !active.isLoading}
        hasFilters={hasFilters}
        onUpdate={update}
        onToggleTrait={toggleTrait}
        onClear={() => {
          setDraft('');
          clear();
        }}
      />

      {/* ------------------------------- results ------------------------------ */}
      {/*
       * The refetch indicator moved into the filter bar, beside the result count it
       * qualifies. It used to sit in a `min-h-5` row of its own between the filters and the
       * grid, which reserved a strip of empty space on every render to hold something that
       * appears for a few hundred milliseconds.
       */}
      {active.isLoading ? (
        <div className="space-y-5">
          {/*
           * Mounted only while loading, so unmounting on success is what cancels its timer.
           * The grid below is unchanged — this adds an explanation above a wait, it does not
           * replace the shape of the thing being waited for.
           */}
          <WakingNotice />
          <AgentGridSkeleton count={9} />
        </div>
      ) : active.isError ? (
        <ErrorState
          {...describeError(active.error)}
          upstream={
            active.error instanceof ApiError &&
            (active.error.code === 'UPSTREAM_UNAVAILABLE' || active.error.code === 'NETWORK_ERROR')
          }
          requestId={active.error instanceof ApiError ? active.error.requestId : null}
          onRetry={() => {
            void active.refetch();
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
          {/*
           * Deliberately not wrapped in `Reveal`. Scroll reveals belong to editorial
           * content the user is reading through; results are the answer to a query they
           * just made, and staging them would put an animation between a filter click
           * and its result. Motion here would be decoration charged to the user's
           * attention.
           */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard key={agent.identity.id} agent={agent} />
            ))}
          </div>

          {meta && meta.totalPages > 1 ? (
            /*
             * Asymmetric, and it states a position rather than a page number.
             *
             * `Previous — 1 / 10,192 — Next` is the default shape of this control everywhere,
             * and it answers the least useful question available: which page of an arbitrary
             * slicing the reader is on. "Agents 1–24 of 87,930" says where they are in the
             * catalogue, which is the thing they were actually counting, and it reuses the
             * ledger voice the toolbar above now opens with.
             *
             * The controls sit together on the right instead of bracketing the text. Paging is
             * one task, so its two buttons belong beside each other where a thumb or a cursor
             * can use them in sequence.
             */
            <nav
              className="mt-12 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-t border-line pt-6"
              aria-label="Agent pagination"
            >
              <div className="min-w-0">
                <p className="display tabular text-sm text-ink-secondary">
                  {formatCount((meta.page - 1) * meta.perPage + 1)}
                  <span className="text-line-strong">–</span>
                  {formatCount(Math.min(meta.page * meta.perPage, meta.total))}
                  <span className="ml-1.5 text-2xs text-ink-faint">
                    of {formatCount(meta.total)}
                  </span>
                </p>
                <p className="eyebrow mt-1.5">
                  Page {formatCount(meta.page)} of {formatCount(meta.totalPages)}
                </p>
              </div>

              <div className="flex items-center gap-2">
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
              </div>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
