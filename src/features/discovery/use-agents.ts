'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import type { ListAgentsParams } from '../../lib/api/contract';
import { PER_PAGE } from './use-discovery-params';

/**
 * Query hooks for discovery.
 *
 * Key factories live beside the hooks so a cache key can never drift from the
 * parameters it represents — the usual cause of a filter change that fetches but
 * renders the previous result.
 */

export const agentKeys = {
  all: ['agents'] as const,
  list: (params: ListAgentsParams) => ['agents', 'list', params] as const,
  detail: (id: string) => ['agents', 'detail', id] as const,
  reputation: (id: string) => ['agents', 'reputation', id] as const,
  jobs: (id: string) => ['agents', 'jobs', id] as const,
  categories: () => ['categories'] as const,
  stats: () => ['stats'] as const,
  search: (query: string, page: number) => ['agents', 'search', query, page] as const,
};

export function useAgents(params: ListAgentsParams) {
  return useQuery({
    queryKey: agentKeys.list(params),
    queryFn: ({ signal }) => api.listAgents(params, signal),
    // Keeps the previous page visible while the next one loads, instead of
    // collapsing the grid to skeletons on every filter change.
    placeholderData: (previous) => previous,
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: agentKeys.detail(id),
    queryFn: ({ signal }) => api.getAgent(id, signal),
  });
}

/**
 * Live reputation for one agent.
 *
 * Kept out of {@link useAgent} because it hits the chain: browsing should not pay
 * for a registry read, but the detail page — where a trust decision is actually
 * made — should not serve a stale number either.
 */
export function useAgentReputation(id: string) {
  return useQuery({
    queryKey: agentKeys.reputation(id),
    queryFn: ({ signal }) => api.getAgentReputation(id, signal),
    // Shorter than the default: this is the number a user is deciding on.
    staleTime: 15_000,
  });
}

/**
 * ERC-8183 jobs for one agent.
 *
 * Separate from {@link useAgent} because the agent payload already carries the tally, which is
 * all a card needs. The individual jobs are only worth fetching once someone opens the profile.
 *
 * Served from the backend's mirror of the escrow kernel rather than read live, so this is cached
 * like a list rather than like the registry read above: a job's status changes when a provider
 * delivers or a dispute window closes, on the order of days, not seconds.
 */
export function useAgentJobs(id: string, enabled: boolean) {
  return useQuery({
    queryKey: agentKeys.jobs(id),
    queryFn: ({ signal }) => api.listAgentJobs(id, 20, signal),
    enabled,
    staleTime: 60_000,
  });
}

/** Marketplace-wide counts. Changes only as ingestion runs, so cached generously. */
export function useStats() {
  return useQuery({
    queryKey: agentKeys.stats(),
    queryFn: ({ signal }) => api.getStats(signal),
    staleTime: 60_000,
  });
}

/**
 * Natural-language search.
 *
 * Distinct from {@link useAgents} in what it accepts: a request in words rather than a
 * set of filters. The backend derives the structured query from it and returns both the
 * matching agents and its own account of how it read the sentence, which is what makes
 * this usable rather than a black box.
 *
 * `enabled` is the caller's decision, because a keyword like "rebalance" is better
 * served by a plain substring match than by intent parsing.
 */
export function useSearch(query: string, page: number, enabled: boolean) {
  return useQuery({
    queryKey: agentKeys.search(query, page),
    queryFn: ({ signal }) => api.search(query, page, PER_PAGE, signal),
    enabled: enabled && query.trim().length > 0,
    // Same reasoning as the list: do not collapse the grid while re-reading a query.
    placeholderData: (previous) => previous,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: agentKeys.categories(),
    queryFn: ({ signal }) => api.listCategories(signal),
    // The taxonomy is static; only the counts move.
    staleTime: 5 * 60_000,
  });
}
