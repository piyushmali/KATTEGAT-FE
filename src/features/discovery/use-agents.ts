'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import type { ListAgentsParams } from '../../lib/api/contract';

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
  categories: () => ['categories'] as const,
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

export function useCategories() {
  return useQuery({
    queryKey: agentKeys.categories(),
    queryFn: ({ signal }) => api.listCategories(signal),
    // The taxonomy is static; only the counts move.
    staleTime: 5 * 60_000,
  });
}
