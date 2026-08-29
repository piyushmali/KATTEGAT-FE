import { describe, expect, it } from 'vitest';
import {
  agentSchema,
  listAgentsResponseSchema,
  listCategoriesResponseSchema,
  reputationResponseSchema,
  searchResponseSchema,
} from './contract';
import { mockListAgents, mockListCategories, mockReputation, mockSearch } from './mock-data';

/**
 * Contract tests for the API boundary.
 *
 * Two things are worth pinning here. First, that the mock fixtures satisfy the
 * same schemas as live responses — mock mode is worthless as a development
 * surface if the fixtures can drift from the real contract. Second, that the
 * snake_case wire format maps to the camelCase shape components consume, since a
 * silent mismatch there renders as `undefined` rather than an error.
 */

describe('agent contract', () => {
  it('maps the wire format to camelCase', () => {
    const parsed = agentSchema.parse({
      identity: {
        id: '56:1',
        chain_id: 56,
        agent_id: 1,
        owner_address: '0xowner',
        wallet_address: null,
        agent_uri: 'ipfs://x',
        registered_at_block: 10,
        registered_at: '2026-01-01T00:00:00.000Z',
      },
      profile: {
        name: 'Test',
        description: null,
        capabilities: ['rebalance'],
        protocol_tag: 'a2a',
        trait_tags: ['x402-paid'],
        metadata_resolved_at: null,
      },
      categories: [
        {
          category: 'rebalancing',
          confidence: 0.8,
          is_primary: true,
          signals: ['capability:rebalance'],
          classifier_version: 'rules-v1',
        },
      ],
      reputation: {
        feedback_count: 3,
        client_count: 2,
        summary_value: 425,
        summary_decimals: 2,
        score: 4.25,
        source: 'test',
        computed_at: '2026-01-01T00:00:00.000Z',
      },
    });

    expect(parsed.identity.chainId).toBe(56);
    expect(parsed.identity.walletAddress).toBeNull();
    expect(parsed.profile.protocolTag).toBe('a2a');
    expect(parsed.profile.metadataResolvedAt).toBeNull();
    expect(parsed.categories[0]?.isPrimary).toBe(true);
    expect(parsed.reputation?.feedbackCount).toBe(3);
    // The decoded score must survive the mapping, not the raw fixed-point value.
    expect(parsed.reputation?.score).toBeCloseTo(4.25, 6);
    expect(parsed.reputation?.summaryDecimals).toBe(2);
  });

  it('rejects a response missing a required field', () => {
    const result = agentSchema.safeParse({ identity: { id: '56:1' } });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown category rather than passing it through', () => {
    const result = agentSchema.safeParse({
      identity: {
        id: '56:1',
        chain_id: 56,
        agent_id: 1,
        owner_address: '0x',
        wallet_address: null,
        agent_uri: null,
        registered_at_block: null,
        registered_at: null,
      },
      profile: {
        name: 'T',
        description: null,
        capabilities: [],
        protocol_tag: 'a2a',
        trait_tags: [],
        metadata_resolved_at: null,
      },
      categories: [
        {
          category: 'not-a-real-category',
          confidence: 1,
          is_primary: true,
          signals: [],
          classifier_version: 'v1',
        },
      ],
      reputation: null,
    });

    expect(result.success).toBe(false);
  });
});

describe('mock fixtures', () => {
  it('satisfy the live agent list contract', () => {
    const parsed = listAgentsResponseSchema.parse(mockListAgents({}));
    expect(parsed.data.length).toBeGreaterThan(0);
    expect(parsed.meta.total).toBe(parsed.data.length);
  });

  it('satisfy the live categories contract and include all four launch categories', () => {
    const parsed = listCategoriesResponseSchema.parse(mockListCategories());
    const ids = parsed.data.map((entry) => entry.id);

    expect(ids).toContain('rebalancing');
    expect(ids).toContain('grid-trading');
    expect(ids).toContain('yield-optimization');
    expect(ids).toContain('health-factor-monitoring');
  });

  it('cover an agent with no reputation and one with unresolved metadata', () => {
    const parsed = listAgentsResponseSchema.parse(mockListAgents({ perPage: 100 }));

    // Both are states the UI must render differently from the happy path.
    expect(parsed.data.some((agent) => agent.reputation === null)).toBe(true);
    expect(parsed.data.some((agent) => agent.reputation?.score === null)).toBe(true);
    expect(parsed.data.some((agent) => agent.profile.metadataResolvedAt === null)).toBe(true);
  });

  it('applies category and trait filters with the same semantics as the API', () => {
    const rebalancing = listAgentsResponseSchema.parse(
      mockListAgents({ category: 'rebalancing', perPage: 100 }),
    );
    expect(rebalancing.data.length).toBeGreaterThan(0);
    for (const agent of rebalancing.data) {
      expect(agent.categories.map((c) => c.category)).toContain('rebalancing');
    }

    // Traits are AND, so an impossible combination must return nothing.
    const impossible = listAgentsResponseSchema.parse(
      mockListAgents({ trait: ['x402-paid', 'tee-attested'], perPage: 100 }),
    );
    expect(impossible.data).toHaveLength(0);
  });

  it('paginates', () => {
    const first = listAgentsResponseSchema.parse(mockListAgents({ page: 1, perPage: 2 }));
    const second = listAgentsResponseSchema.parse(mockListAgents({ page: 2, perPage: 2 }));

    expect(first.data).toHaveLength(2);
    expect(first.meta.totalPages).toBeGreaterThan(1);
    expect(second.data[0]?.identity.id).not.toBe(first.data[0]?.identity.id);
  });

  it('satisfy the reputation contract and never claim a live chain read', () => {
    const parsed = reputationResponseSchema.parse(mockReputation('56:900001'));

    expect(parsed.data.agentId).toBe('56:900001');
    expect(parsed.data.score).toBeCloseTo(92.4, 6);
    /*
     * On ERC-8004's 0–100 scale. The fixtures previously modelled a 0–5 star scale, which
     * is where the invented "/ 5" in the UI came from — a fixture that lies about its
     * units teaches every test and component built on it to lie too.
     */
    expect(parsed.data.score).toBeLessThanOrEqual(100);
    expect(parsed.data.score).toBeGreaterThanOrEqual(0);
    // A fixture is not a registry read, and must not label itself as one.
    expect(parsed.data.origin).toBe('snapshot');
    expect(parsed.data.notes.join(' ')).toContain('Mock');
  });

  it('return null reputation for an unknown agent', () => {
    expect(mockReputation('56:404404')).toBeNull();
  });

  it('satisfy the search contract and return an interpretation', () => {
    const parsed = searchResponseSchema.parse(mockSearch('conservative yield agent', 1, 10));

    expect(parsed.meta.interpretation.filters.category).toBe('yield-optimization');
    expect(parsed.meta.interpretation.filters.resolvedOnly).toBe(true);
    expect(parsed.meta.interpretation.explanation.length).toBeGreaterThan(0);
    for (const agent of parsed.data) {
      expect(agent.categories.map((c) => c.category)).toContain('yield-optimization');
    }
  });
});

describe('every fixture score stays on the scale ERC-8004 defines', () => {
  /**
   * A blanket guard, because the invented "/ 5" in the UI originated in these fixtures.
   * A fixture that lies about its units teaches every test and component built on it to
   * lie too, and it does so silently — nothing here failed while the scale was wrong.
   */
  it('holds for all mock agents with reputation', () => {
    const { data } = listAgentsResponseSchema.parse(mockListAgents({ perPage: 100 }));
    const scored = data.filter((agent) => agent.reputation?.score != null);

    // Guards the guard: if the fixtures ever stop carrying scores, this must not pass by
    // vacuously checking nothing.
    expect(scored.length).toBeGreaterThan(0);

    for (const agent of scored) {
      const score = agent.reputation?.score;
      expect(score, `${agent.identity.id} score`).toBeGreaterThanOrEqual(0);
      expect(score, `${agent.identity.id} score`).toBeLessThanOrEqual(100);
    }
  });
});
