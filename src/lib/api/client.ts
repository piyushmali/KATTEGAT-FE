import type { z } from 'zod';
import { env } from '../../config/env';
import { ApiError, apiErrorFromResponse } from './errors';
import {
  agentDetailResponseSchema,
  ecosystemStatsResponseSchema,
  listAgentsResponseSchema,
  listCategoriesResponseSchema,
  reputationResponseSchema,
  searchResponseSchema,
  type Agent,
  type EcosystemStats,
  type ListAgentsParams,
  type ListAgentsResponse,
  type ListCategoriesResponse,
  type ReputationDetail,
  type SearchResponse,
} from './contract';
import {
  mockAgentDetail,
  mockListAgents,
  mockListCategories,
  mockReputation,
  mockSearch,
  mockStats,
} from './mock-data';

/**
 * The only place in the frontend that talks HTTP.
 *
 * Two guarantees it provides to everything above it:
 *  1. Every response is parsed against the contract, so a component never
 *     receives a shape the schema did not approve.
 *  2. Every failure is an {@link ApiError} with a stable `code` — network,
 *     HTTP and schema failures included.
 */

const REQUEST_TIMEOUT_MS = 15_000;

function buildQuery(params: ListAgentsParams): string {
  const search = new URLSearchParams();

  if (params.category) search.set('category', params.category);
  if (params.protocol) search.set('protocol', params.protocol);
  if (params.q) search.set('q', params.q);
  // Repeated key: the API requires all listed traits (AND semantics).
  for (const trait of params.trait ?? []) search.append('trait', trait);
  if (params.resolvedOnly !== undefined) search.set('resolved_only', String(params.resolvedOnly));
  if (params.minConfidence !== undefined) search.set('min_confidence', String(params.minConfidence));
  if (params.sort) search.set('sort', params.sort);
  if (params.direction) search.set('direction', params.direction);
  if (params.page !== undefined) search.set('page', String(params.page));
  if (params.perPage !== undefined) search.set('per_page', String(params.perPage));

  const query = search.toString();
  return query ? `?${query}` : '';
}

async function request<TSchema extends z.ZodType>(
  path: string,
  schema: TSchema,
  signal?: AbortSignal,
): Promise<z.output<TSchema>> {
  let response: Response;

  try {
    response = await fetch(`${env.apiBaseUrl}${path}`, {
      headers: { accept: 'application/json' },
      signal: signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    // A caller-initiated abort is not an error worth reporting as one.
    if (error instanceof DOMException && error.name === 'AbortError' && signal?.aborted) {
      throw error;
    }
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: 'The KATTEGAT API could not be reached.',
      status: 0,
    });
  }

  if (!response.ok) {
    throw await apiErrorFromResponse(response);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError({
      code: 'CONTRACT_MISMATCH',
      message: 'The API returned a body that is not valid JSON.',
      status: response.status,
      requestId: response.headers.get('x-request-id'),
    });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    // Loud on purpose. Silently coercing a drifted contract is how a UI ends up
    // rendering "undefined" to a user.
    throw new ApiError({
      code: 'CONTRACT_MISMATCH',
      message: 'The API response did not match the expected contract.',
      status: response.status,
      requestId: response.headers.get('x-request-id'),
      details: parsed.error.issues.slice(0, 5),
    });
  }

  return parsed.data as z.output<TSchema>;
}

/**
 * Data access used by the whole app.
 *
 * In `mock` mode the fixtures are returned instead of calling the network, but
 * they are parsed through the same schemas — so a fixture that drifts from the
 * contract fails exactly as a bad API response would.
 */
export const api = {
  async listAgents(params: ListAgentsParams = {}, signal?: AbortSignal): Promise<ListAgentsResponse> {
    if (env.dataSource === 'mock') {
      return listAgentsResponseSchema.parse(mockListAgents(params));
    }
    return request(`/api/v1/agents${buildQuery(params)}`, listAgentsResponseSchema, signal);
  },

  async getAgent(id: string, signal?: AbortSignal): Promise<Agent> {
    if (env.dataSource === 'mock') {
      const payload = mockAgentDetail(id);
      if (!payload) {
        throw new ApiError({
          code: 'NOT_FOUND',
          message: `No agent with id "${id}" has been indexed.`,
          status: 404,
        });
      }
      return agentDetailResponseSchema.parse(payload).data;
    }
    const result = await request(
      `/api/v1/agents/${encodeURIComponent(id)}`,
      agentDetailResponseSchema,
      signal,
    );
    return result.data;
  },

  async listCategories(signal?: AbortSignal): Promise<ListCategoriesResponse> {
    if (env.dataSource === 'mock') {
      return listCategoriesResponseSchema.parse(mockListCategories());
    }
    return request('/api/v1/categories', listCategoriesResponseSchema, signal);
  },

  /**
   * Live reputation read. Separate from the snapshot embedded in an agent record
   * because this one hits the registry, so it is fetched on demand rather than
   * with every list row.
   */
  async getAgentReputation(id: string, signal?: AbortSignal): Promise<ReputationDetail> {
    if (env.dataSource === 'mock') {
      const payload = mockReputation(id);
      if (!payload) {
        throw new ApiError({
          code: 'NOT_FOUND',
          message: `No agent with id "${id}" has been indexed.`,
          status: 404,
        });
      }
      return reputationResponseSchema.parse(payload).data;
    }
    const result = await request(
      `/api/v1/agents/${encodeURIComponent(id)}/reputation`,
      reputationResponseSchema,
      signal,
    );
    return result.data;
  },

  /** Marketplace-wide counts for the landing page. Real counts only. */
  async getStats(signal?: AbortSignal): Promise<EcosystemStats> {
    if (env.dataSource === 'mock') {
      return ecosystemStatsResponseSchema.parse(mockStats()).data;
    }
    const result = await request('/api/v1/stats', ecosystemStatsResponseSchema, signal);
    return result.data;
  },

  /** Natural-language search. Returns the interpretation alongside the results. */
  async search(query: string, page = 1, perPage = 24, signal?: AbortSignal): Promise<SearchResponse> {
    if (env.dataSource === 'mock') {
      return searchResponseSchema.parse(mockSearch(query, page, perPage));
    }
    const params = new URLSearchParams({
      q: query,
      page: String(page),
      per_page: String(perPage),
    });
    return request(`/api/v1/search?${params.toString()}`, searchResponseSchema, signal);
  },
};
