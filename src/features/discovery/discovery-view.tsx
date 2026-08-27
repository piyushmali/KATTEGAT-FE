'use client';

import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { AgentGridSkeleton, EmptyState, ErrorState, InlineSpinner } from '../../components/ui/states';
import { AgentCard } from '../agents/agent-card';
import { describeError, ApiError } from '../../lib/api/errors';
import { isMockMode } from '../../config/env';
import type { AgentCategoryId, ListAgentsParams } from '../../lib/api/contract';
import { useAgents, useCategories } from './use-agents';
import { useDebouncedValue } from './use-debounced-value';

/**
 * The discovery surface: search, filter, browse.
 *
 * Every state the data layer can produce is rendered explicitly — first load,
 * background refetch, empty result, filtered-to-nothing, and error with a retry.
 * The distinction between "no agents indexed at all" and "no agents match these
 * filters" is kept, because the fix differs: run a sync versus clear a filter.
 */

const PER_PAGE = 12;

const PROTOCOL_OPTIONS = ['a2a', 'mcp', 'http-api', 'custom', 'unconfigured'] as const;

export function DiscoveryView() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<AgentCategoryId | null>(null);
  const [protocol, setProtocol] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Avoids a request per keystroke while keeping the input fully responsive.
  const debouncedSearch = useDebouncedValue(search, 300);

  const params = useMemo<ListAgentsParams>(() => {
    const next: ListAgentsParams = { page, perPage: PER_PAGE, sort: 'registered_at', direction: 'desc' };
    if (debouncedSearch.trim().length > 0) next.q = debouncedSearch.trim();
    if (category) next.category = category;
    if (protocol) next.protocol = protocol;
    return next;
  }, [debouncedSearch, category, protocol, page]);

  const agentsQuery = useAgents(params);
  const categoriesQuery = useCategories();

  const hasFilters = debouncedSearch.trim().length > 0 || category !== null || protocol !== null;

  const clearFilters = (): void => {
    setSearch('');
    setCategory(null);
    setProtocol(null);
    setPage(1);
  };

  /** Any filter change invalidates the current page number. */
  const withPageReset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {isMockMode ? (
        <div
          role="status"
          className="rounded-control border border-caution-muted bg-caution-muted/10 px-3 py-2 text-xs text-caution"
        >
          Mock data source. These agents are fixtures, not live ERC-8004 registry data.
        </div>
      ) : null}

      {/* ------------------------------ controls ------------------------------ */}
      <div className="space-y-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-content-faint"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search agents by name or what they do"
            aria-label="Search agents"
            className="h-11 w-full rounded-control border border-line-subtle bg-surface-inset pr-4 pl-9 text-sm text-content-primary placeholder:text-content-faint focus:border-accent-muted focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-2xs tracking-wide text-content-faint uppercase">
            <SlidersHorizontal className="size-3" aria-hidden="true" />
            Category
          </span>

          <FilterChip active={category === null} onClick={() => withPageReset(setCategory)(null)}>
            All
          </FilterChip>

          {/* Rendered from the API so an empty category stays browsable. */}
          {categoriesQuery.data?.data.map((entry) => (
            <FilterChip
              key={entry.id}
              active={category === entry.id}
              onClick={() => withPageReset(setCategory)(entry.id)}
              title={entry.description}
            >
              {entry.label}
              <span className="ml-1.5 text-content-faint">{entry.agentCount}</span>
            </FilterChip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-2xs tracking-wide text-content-faint uppercase">Protocol</span>
          <FilterChip active={protocol === null} onClick={() => withPageReset(setProtocol)(null)}>
            Any
          </FilterChip>
          {PROTOCOL_OPTIONS.map((option) => (
            <FilterChip
              key={option}
              active={protocol === option}
              onClick={() => withPageReset(setProtocol)(option)}
            >
              {option}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* ------------------------------- results ------------------------------ */}
      <div className="flex min-h-6 items-center justify-between gap-4">
        <p className="text-xs text-content-muted" aria-live="polite">
          {agentsQuery.data ? (
            <>
              <span className="font-medium text-content-secondary">
                {agentsQuery.data.meta.total}
              </span>{' '}
              {agentsQuery.data.meta.total === 1 ? 'agent' : 'agents'}
              {hasFilters ? ' matching your filters' : ' indexed'}
            </>
          ) : null}
        </p>
        {/* Distinguishes a background refetch from a first load. */}
        {agentsQuery.isFetching && !agentsQuery.isLoading ? (
          <InlineSpinner label="Refreshing" />
        ) : null}
      </div>

      {agentsQuery.isLoading ? (
        <AgentGridSkeleton count={6} />
      ) : agentsQuery.isError ? (
        <ErrorState
          {...describeError(agentsQuery.error)}
          requestId={
            agentsQuery.error instanceof ApiError ? agentsQuery.error.requestId : null
          }
          onRetry={() => {
            void agentsQuery.refetch();
          }}
        />
      ) : agentsQuery.data && agentsQuery.data.data.length === 0 ? (
        hasFilters ? (
          <EmptyState
            title="No agents match these filters"
            description="Nothing in the index matches that combination. Try widening the category or clearing the search."
            action={
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          // A genuinely empty index is an operations problem, so say so.
          <EmptyState
            title="No agents indexed yet"
            description="The marketplace is connected but the catalogue is empty. Run an ingestion pass on the backend (pnpm sync:agents) to index agents from the ERC-8004 registry."
          />
        )
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {agentsQuery.data?.data.map((agent) => (
              <AgentCard key={agent.identity.id} agent={agent} />
            ))}
          </div>

          {agentsQuery.data && agentsQuery.data.meta.totalPages > 1 ? (
            <nav
              className="flex items-center justify-between gap-4 pt-2"
              aria-label="Agent pagination"
            >
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  setPage((current) => Math.max(1, current - 1));
                }}
              >
                Previous
              </Button>
              <span className="text-xs text-content-muted">
                Page {agentsQuery.data.meta.page} of {agentsQuery.data.meta.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= agentsQuery.data.meta.totalPages}
                onClick={() => {
                  setPage((current) => current + 1);
                }}
              >
                Next
              </Button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function FilterChip({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      // Communicates selection to assistive tech, not just visually.
      aria-pressed={active}
      className={
        active
          ? 'rounded-pill bg-accent px-2.5 py-1 text-2xs font-semibold text-accent-contrast'
          : 'rounded-pill bg-surface-overlay px-2.5 py-1 text-2xs font-medium text-content-secondary ring-1 ring-inset ring-line-subtle transition-colors hover:bg-surface-hover hover:text-content-primary'
      }
    >
      {children}
    </button>
  );
}
