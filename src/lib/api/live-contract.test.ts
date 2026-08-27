import { beforeAll, describe, expect, it } from 'vitest';
import {
  agentDetailResponseSchema,
  listAgentsResponseSchema,
  listCategoriesResponseSchema,
  reputationResponseSchema,
  searchResponseSchema,
} from './contract';

/**
 * Contract check against a running backend.
 *
 * This is the test that matters most across two independently deployed
 * repositories: it proves the schemas in contract.ts still describe what
 * KATTEGAT-BE actually returns. Unit tests against fixtures cannot catch a
 * backend that renamed a field.
 *
 * Skips itself when the API is unreachable, so `pnpm test` stays useful without a
 * backend. Point it at a running instance to get the real coverage:
 *
 *   NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000 pnpm test
 */

const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:4000').replace(/\/$/, '');

let reachable = false;

async function get(path: string): Promise<unknown> {
  const response = await fetch(`${BASE}${path}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`${path} returned ${String(response.status)}`);
  return response.json();
}

beforeAll(async () => {
  try {
    const response = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(3_000) });
    reachable = response.ok;
  } catch {
    reachable = false;
  }
  if (!reachable) {
    process.stdout.write(
      `\n  [skipped] KATTEGAT API not reachable at ${BASE} — start it with \`pnpm dev\` in KATTEGAT-BE to run live contract checks.\n`,
    );
  }
});

describe('live API contract', () => {
  it('GET /api/v1/categories matches the frontend contract', async () => {
    if (!reachable) return;

    const parsed = listCategoriesResponseSchema.parse(await get('/api/v1/categories'));
    const ids = parsed.data.map((entry) => entry.id);

    // All four launch categories must always be browsable, even at zero count.
    expect(ids).toContain('rebalancing');
    expect(ids).toContain('grid-trading');
    expect(ids).toContain('yield-optimization');
    expect(ids).toContain('health-factor-monitoring');
    expect(parsed.meta.totalAgents).toBeGreaterThanOrEqual(0);
  });

  it('GET /api/v1/agents matches the frontend contract', async () => {
    if (!reachable) return;

    const parsed = listAgentsResponseSchema.parse(await get('/api/v1/agents?per_page=5'));

    expect(parsed.meta.perPage).toBe(5);
    expect(parsed.data.length).toBeLessThanOrEqual(5);

    for (const agent of parsed.data) {
      // The composite id the UI routes on.
      expect(agent.identity.id).toMatch(/^\d+:\d+$/);
      expect(agent.profile.name.length).toBeGreaterThan(0);
      // Every agent carries at least one classification, even if uncategorized.
      expect(agent.categories.length).toBeGreaterThan(0);
      expect(agent.categories.some((entry) => entry.isPrimary)).toBe(true);
      // Reputation is optional, but when present the decoded score must agree
      // with the raw fixed-point pair the registry returned.
      const reputation = agent.reputation;
      if (reputation && reputation.summaryValue !== null && reputation.summaryDecimals !== null) {
        expect(reputation.score).toBeCloseTo(
          reputation.summaryValue / 10 ** reputation.summaryDecimals,
          6,
        );
      }
    }
  });

  it('GET /api/v1/agents/:id matches the frontend contract', async () => {
    if (!reachable) return;

    const list = listAgentsResponseSchema.parse(await get('/api/v1/agents?per_page=1'));
    const first = list.data[0];
    if (!first) return; // Empty index is valid; nothing to assert against.

    const parsed = agentDetailResponseSchema.parse(
      await get(`/api/v1/agents/${encodeURIComponent(first.identity.id)}`),
    );
    expect(parsed.data.identity.id).toBe(first.identity.id);
  });

  it('filters compose without breaking the contract', async () => {
    if (!reachable) return;

    const parsed = listAgentsResponseSchema.parse(
      await get('/api/v1/agents?protocol=a2a&sort=registered_at&direction=desc&per_page=3'),
    );
    for (const agent of parsed.data) {
      expect(agent.profile.protocolTag).toBe('a2a');
    }
  });

  it('GET /api/v1/agents/:id/reputation matches the frontend contract', async () => {
    if (!reachable) return;

    const list = listAgentsResponseSchema.parse(await get('/api/v1/agents?per_page=1'));
    const first = list.data[0];
    if (!first) return;

    const parsed = reputationResponseSchema.parse(
      await get(`/api/v1/agents/${encodeURIComponent(first.identity.id)}/reputation`),
    );
    const reputation = parsed.data;

    expect(reputation.agentId).toBe(first.identity.id);
    // Provenance must always be stated — the UI renders it.
    expect(['chain', 'snapshot', 'explorer']).toContain(reputation.origin);
    expect(Array.isArray(reputation.notes)).toBe(true);

    if (reputation.summaryValue !== null && reputation.summaryDecimals !== null) {
      expect(reputation.score).toBeCloseTo(
        reputation.summaryValue / 10 ** reputation.summaryDecimals,
        6,
      );
    } else {
      // No feedback is null, never a fabricated zero.
      expect(reputation.score).toBeNull();
    }
  });

  it('GET /api/v1/search returns results with an interpretation', async () => {
    if (!reachable) return;

    const parsed = searchResponseSchema.parse(
      await get(`/api/v1/search?q=${encodeURIComponent('newest a2a research agents')}&per_page=3`),
    );
    const { interpretation } = parsed.meta;

    expect(interpretation.query).toContain('research');
    expect(['rules', 'ai-assisted']).toContain(interpretation.resolvedBy);
    // The interpretation must be explainable, not opaque.
    expect(interpretation.explanation.length).toBeGreaterThan(0);
    // The protocol signal has to survive into the executed filters.
    expect(interpretation.filters.protocol).toBe('a2a');
    for (const agent of parsed.data) {
      expect(agent.profile.protocolTag).toBe('a2a');
    }
  });

  it('search reads the brief example query without erroring', async () => {
    if (!reachable) return;

    const parsed = searchResponseSchema.parse(
      await get(
        `/api/v1/search?q=${encodeURIComponent('conservative yield agent for stablecoins with a long track record')}`,
      ),
    );

    expect(parsed.meta.interpretation.filters.category).toBe('yield-optimization');
    // "conservative"/"track record" become ranking + a resolved-metadata constraint,
    // and must not leak into the free-text match.
    expect(parsed.meta.interpretation.filters.resolvedOnly).toBe(true);
    expect(parsed.meta.interpretation.filters.text ?? '').not.toContain('conservative');
  });
});
