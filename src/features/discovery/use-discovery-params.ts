'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AGENT_CATEGORIES, type AgentCategoryId, type ListAgentsParams } from '../../lib/api/contract';

/**
 * Discovery filter state, held in the URL.
 *
 * The URL is the store. That gives shareable searches, working back/forward
 * navigation and refresh persistence for free, and it is why there is no client
 * state library in this project — a filter set is navigation state, not app state.
 *
 * Everything is validated on read: a hand-edited `?category=nonsense` is dropped
 * rather than sent to the API to be rejected.
 */

export const SORT_OPTIONS = [
  { value: 'registered_at', label: 'Recently registered' },
  { value: 'feedback', label: 'Most feedback' },
  { value: 'reputation', label: 'Highest reputation' },
  { value: 'name', label: 'Name (A–Z)' },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]['value'];

export const PROTOCOL_OPTIONS = [
  { value: 'a2a', label: 'A2A' },
  { value: 'mcp', label: 'MCP' },
  { value: 'http-api', label: 'HTTP API' },
  { value: 'custom', label: 'Custom' },
  { value: 'unconfigured', label: 'Unconfigured' },
] as const;

export const TRAIT_OPTIONS = [
  { value: 'declared-active', label: 'Declared active' },
  { value: 'x402-paid', label: 'Accepts x402' },
  { value: 'multichain', label: 'Multichain' },
  { value: 'tee-attested', label: 'TEE attested' },
] as const;

export const PER_PAGE = 24;

export interface DiscoveryState {
  q: string;
  category: AgentCategoryId | null;
  protocol: string | null;
  traits: string[];
  resolvedOnly: boolean;
  sort: SortValue;
  page: number;
}

const isCategory = (value: string): value is AgentCategoryId =>
  (AGENT_CATEGORIES as readonly string[]).includes(value);

const isSort = (value: string): value is SortValue =>
  SORT_OPTIONS.some((option) => option.value === value);

export function useDiscoveryParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state = useMemo<DiscoveryState>(() => {
    const rawCategory = searchParams.get('category') ?? '';
    const rawProtocol = searchParams.get('protocol') ?? '';
    const rawSort = searchParams.get('sort') ?? '';
    const page = Number(searchParams.get('page') ?? '1');

    return {
      q: searchParams.get('q') ?? '',
      category: isCategory(rawCategory) ? rawCategory : null,
      protocol: PROTOCOL_OPTIONS.some((option) => option.value === rawProtocol)
        ? rawProtocol
        : null,
      traits: searchParams
        .getAll('trait')
        .filter((trait) => TRAIT_OPTIONS.some((option) => option.value === trait)),
      resolvedOnly: searchParams.get('resolved') === '1',
      sort: isSort(rawSort) ? rawSort : 'registered_at',
      page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
    };
  }, [searchParams]);

  /**
   * Writes a partial update back to the URL.
   *
   * Any change other than the page itself resets to page 1 — staying on page 7 of a
   * filter that now has two results is the classic pagination bug.
   *
   * `scroll: false` because the filter controls sit above the grid; scrolling to top
   * on every chip click would fight the user.
   */
  const update = useCallback(
    (patch: Partial<DiscoveryState>) => {
      const next = new URLSearchParams(searchParams.toString());

      const setOrDelete = (key: string, value: string | null) => {
        if (value === null || value === '') next.delete(key);
        else next.set(key, value);
      };

      if ('q' in patch) setOrDelete('q', patch.q ?? null);
      if ('category' in patch) setOrDelete('category', patch.category ?? null);
      if ('protocol' in patch) setOrDelete('protocol', patch.protocol ?? null);
      if ('sort' in patch) {
        setOrDelete('sort', patch.sort && patch.sort !== 'registered_at' ? patch.sort : null);
      }
      if ('resolvedOnly' in patch) setOrDelete('resolved', patch.resolvedOnly ? '1' : null);
      if ('traits' in patch) {
        next.delete('trait');
        for (const trait of patch.traits ?? []) next.append('trait', trait);
      }

      const onlyPageChanged = Object.keys(patch).length === 1 && 'page' in patch;
      const page = onlyPageChanged ? (patch.page ?? 1) : 1;
      setOrDelete('page', page > 1 ? String(page) : null);

      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const clear = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  const toggleTrait = useCallback(
    (trait: string) => {
      const traits = state.traits.includes(trait)
        ? state.traits.filter((entry) => entry !== trait)
        : [...state.traits, trait];
      update({ traits });
    },
    [state.traits, update],
  );

  /** True when anything narrows the result set — drives the "clear" affordance. */
  const hasFilters =
    state.q.trim().length > 0 ||
    state.category !== null ||
    state.protocol !== null ||
    state.traits.length > 0 ||
    state.resolvedOnly;

  /** Maps URL state onto the API's parameter names. */
  const queryParams = useMemo<ListAgentsParams>(() => {
    const params: ListAgentsParams = {
      page: state.page,
      perPage: PER_PAGE,
      sort: state.sort,
      direction: state.sort === 'name' ? 'asc' : 'desc',
    };
    const trimmed = state.q.trim();
    if (trimmed.length > 0) params.q = trimmed;
    if (state.category) params.category = state.category;
    if (state.protocol) params.protocol = state.protocol;
    if (state.traits.length > 0) params.trait = state.traits;
    if (state.resolvedOnly) params.resolvedOnly = true;
    return params;
  }, [state]);

  return { state, update, clear, toggleTrait, hasFilters, queryParams };
}
