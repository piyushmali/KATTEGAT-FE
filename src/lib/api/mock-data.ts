import type { AgentCategoryId, ListAgentsParams } from './contract';

/**
 * Fixtures for `NEXT_PUBLIC_DATA_SOURCE=mock`.
 *
 * These are SYNTHETIC. They exist so the frontend can be developed and its
 * states exercised without a running backend or a synced database — nothing
 * here is real on-chain data, and none of it is ever shown in `live` mode.
 *
 * They are shaped as the wire format (snake_case) and parsed through the same
 * Zod contract as real responses, so a fixture that drifts from the API contract
 * fails loudly rather than masking a mismatch.
 *
 * The set is chosen to cover states the happy path would miss: all four
 * categories, an agent with no reputation, an agent whose metadata never
 * resolved, and an agent spanning two categories.
 */

type WireAgent = {
  identity: {
    id: string;
    chain_id: number;
    agent_id: number;
    owner_address: string;
    wallet_address: string | null;
    agent_uri: string | null;
    registered_at_block: number | null;
    registered_at: string | null;
  };
  profile: {
    name: string;
    description: string | null;
    capabilities: string[];
    protocol_tag: string;
    trait_tags: string[];
    image_url: string | null;
    endpoints: {
      label: string | null;
      value: string;
      url: string | null;
      kind: 'a2a' | 'mcp' | 'web' | 'wallet' | 'social' | 'other';
      version: string | null;
    }[];
    trust_models: string[];
    x402_support: boolean | null;
    declared_active: boolean | null;
    metadata_resolved_at: string | null;
  };
  categories: {
    category: string;
    confidence: number;
    is_primary: boolean;
    signals: string[];
    classifier_version: string;
  }[];
  reputation: {
    feedback_count: number;
    client_count: number;
    summary_value: number | null;
    summary_decimals: number | null;
    score: number | null;
    source: string;
    computed_at: string;
  } | null;
  jobs: {
    total: number;
    funded: number;
    completed: number;
    awaiting_release: number;
    settled_raw: string;
    escrowed_raw: string;
    token_symbol: string;
    token_decimals: number;
    last_job_at: string | null;
  } | null;
};

const SOURCE = 'mock:fixture';
const CLASSIFIER = 'rules-v1';

const address = (seed: string): string => `0x${seed.repeat(40).slice(0, 40)}`;

/**
 * Synthetic escrow, shaped like the real thing.
 *
 * `total` is always at least `funded`, because on the real kernel anyone can create a job naming
 * any provider without paying for it, and the panel leads with the funded count for exactly that
 * reason. A fixture where the two are equal would never exercise the distinction.
 *
 * Mocked at all, unlike sessions, because escrow is descriptive where a session is authority
 * over someone's wallet: a synthetic spend cap with a working revoke button is dangerous, a
 * synthetic delivery count in a mode that says SYNTHETIC at the top is not.
 */
const jobs = (
  total: number,
  funded: number,
  completed: number,
  settled: string,
  escrowed: string,
): WireAgent['jobs'] => ({
  total,
  funded,
  completed,
  awaiting_release: funded - completed,
  settled_raw: settled,
  escrowed_raw: escrowed,
  token_symbol: 'U',
  token_decimals: 18,
  last_job_at: '2026-08-24T17:39:37.000Z',
});

const AGENTS_WITHOUT_JOBS: Omit<WireAgent, 'jobs'>[] = [
  {
    identity: {
      id: '56:900001',
      chain_id: 56,
      agent_id: 900001,
      owner_address: address('a1'),
      wallet_address: address('a2'),
      agent_uri: 'ipfs://example-rebalancer',
      registered_at_block: 118_000_001,
      registered_at: '2026-06-01T09:15:00.000Z',
    },
    profile: {
      name: 'Meridian Rebalancer',
      description:
        'Monitors a portfolio against its target allocation and trades back to target weights whenever drift exceeds a configured threshold band.',
      capabilities: ['rebalance', 'allocation', 'portfolio'],
      protocol_tag: 'a2a',
      trait_tags: ['declared-active', 'reputation-trust'],
      image_url: 'https://www.iconaves.com/logo/pro.ave.ai.png',
      endpoints: [
        {
          label: 'A2A',
          value: 'https://meridian.example/.well-known/agent-card.json',
          url: 'https://meridian.example/.well-known/agent-card.json',
          kind: 'a2a',
          version: '0.3.0',
        },
        {
          label: 'web',
          value: 'https://meridian.example/dashboard',
          url: 'https://meridian.example/dashboard',
          kind: 'web',
          version: null,
        },
      ],
      trust_models: ['reputation'],
      x402_support: false,
      declared_active: true,
      metadata_resolved_at: '2026-06-01T09:20:00.000Z',
    },
    categories: [
      {
        category: 'rebalancing',
        confidence: 1,
        is_primary: true,
        signals: ['capability:rebalance', 'phrase:target allocation', 'phrase:threshold band'],
        classifier_version: CLASSIFIER,
      },
    ],
    // 462 at 2dp renders as 4.62 — exercises the fixed-point decoding path.
    reputation: {
      feedback_count: 41,
      client_count: 28,
      summary_value: 9240,
      summary_decimals: 2,
      score: 92.4,
      source: SOURCE,
      computed_at: '2026-08-27T10:00:00.000Z',
    },
  },
  {
    identity: {
      id: '56:900002',
      chain_id: 56,
      agent_id: 900002,
      owner_address: address('b1'),
      wallet_address: address('b2'),
      agent_uri: 'ipfs://example-grid',
      registered_at_block: 118_000_120,
      registered_at: '2026-06-04T14:02:00.000Z',
    },
    profile: {
      name: 'Tidewater Grid',
      description:
        'Runs a grid trading strategy across a configurable price grid, working the range with a ladder of staggered orders.',
      capabilities: ['grid-trading', 'market-making'],
      protocol_tag: 'mcp',
      trait_tags: ['x402-paid', 'declared-active'],
      image_url: 'https://evoevo.ai/images/agent-mcp.webp',
      endpoints: [
        {
          label: 'MCP',
          value: 'https://tidewater.example/v1/mcp',
          url: 'https://tidewater.example/v1/mcp',
          kind: 'mcp',
          version: '1.2.0',
        },
        {
          /*
           * A templated endpoint, resolved. A third of the live registry looks like this:
           * the operator publishes one URL for their whole platform and the backend fills
           * in the agent id. `value` keeps the template, `url` is where a click goes, and
           * the UI must show the second or the link looks broken.
           *
           * `version` is deliberately not semver. Prefixing "v" unconditionally rendered
           * "vaacp-platform-v1" on 10,890 endpoints.
           */
          label: 'Termix Platform',
          value: 'https://tidewater.example/api/v1/agents/{agentId}/services',
          url: 'https://tidewater.example/api/v1/agents/900002/services',
          kind: 'web',
          version: 'aacp-platform-v1',
        },
      ],
      trust_models: ['reputation', 'crypto-economic'],
      x402_support: true,
      declared_active: true,
      metadata_resolved_at: '2026-06-04T14:06:00.000Z',
    },
    categories: [
      {
        category: 'grid-trading',
        confidence: 1,
        is_primary: true,
        signals: ['capability:grid-trading', 'phrase:grid trading', 'phrase:price grid'],
        classifier_version: CLASSIFIER,
      },
    ],
    reputation: {
      feedback_count: 12,
      client_count: 9,
      summary_value: 7760,
      summary_decimals: 2,
      score: 77.6,
      source: SOURCE,
      computed_at: '2026-08-27T10:00:00.000Z',
    },
  },
  {
    identity: {
      id: '56:900003',
      chain_id: 56,
      agent_id: 900003,
      owner_address: address('c1'),
      wallet_address: null,
      agent_uri: 'ipfs://example-yield',
      registered_at_block: 118_000_400,
      registered_at: '2026-06-11T08:44:00.000Z',
    },
    profile: {
      name: 'Kelp Yield Router',
      description:
        'Seeks the highest risk-adjusted yield across lending markets and will auto-compound rewards on a schedule.',
      capabilities: ['yield', 'autocompound', 'vault'],
      protocol_tag: 'a2a',
      trait_tags: ['multichain', 'declared-active'],
      image_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=kelp',
      endpoints: [
        {
          label: 'A2A',
          value: 'https://kelp.example/.well-known/agent-card.json',
          url: 'https://kelp.example/.well-known/agent-card.json',
          kind: 'a2a',
          version: '0.3.0',
        },
        {
          /*
           * A CAIP-10 contract reference: displayable, not linkable. Present so the
           * `value` / `url` split is exercised by the fixtures rather than only by unit
           * tests, since it is the case a renderer is most likely to get wrong.
           */
          label: 'bap578',
          value: 'eip155:56:0x15b15DF2fFFF6653C21C11b93fB8A7718CE854Ce/10711',
          url: null,
          kind: 'other',
          version: null,
        },
      ],
      trust_models: ['reputation'],
      x402_support: false,
      declared_active: true,
      metadata_resolved_at: '2026-06-11T08:49:00.000Z',
    },
    categories: [
      {
        category: 'yield-optimization',
        confidence: 1,
        is_primary: true,
        signals: ['capability:yield', 'phrase:auto-compound', 'phrase:risk-adjusted yield'],
        classifier_version: CLASSIFIER,
      },
    ],
    // No feedback yet: `score: null` must render as "no reputation", not "0".
    reputation: {
      feedback_count: 0,
      client_count: 0,
      summary_value: null,
      summary_decimals: null,
      score: null,
      source: SOURCE,
      computed_at: '2026-08-27T10:00:00.000Z',
    },
  },
  {
    identity: {
      id: '56:900004',
      chain_id: 56,
      agent_id: 900004,
      owner_address: address('d1'),
      wallet_address: address('d2'),
      agent_uri: 'ipfs://example-health',
      registered_at_block: 118_001_010,
      registered_at: '2026-07-02T19:30:00.000Z',
    },
    profile: {
      name: 'Ballast Health Monitor',
      description:
        'Tracks the health factor of leveraged lending positions and repays debt or tops up collateral before liquidation risk becomes critical.',
      capabilities: ['health-factor', 'liquidation-protection', 'collateral'],
      protocol_tag: 'a2a',
      trait_tags: ['tee-attested', 'declared-active', 'reputation-trust'],
      image_url: 'https://r2-image-worker.pieverse-img.workers.dev/sentinel.png',
      endpoints: [
        {
          label: 'A2A',
          value: 'https://ballast.example/.well-known/agent-card.json',
          url: 'https://ballast.example/.well-known/agent-card.json',
          kind: 'a2a',
          version: '0.3.0',
        },
      ],
      trust_models: ['reputation', 'tee-attestation'],
      x402_support: false,
      declared_active: true,
      metadata_resolved_at: '2026-07-02T19:35:00.000Z',
    },
    categories: [
      {
        category: 'health-factor-monitoring',
        confidence: 1,
        is_primary: true,
        signals: ['capability:health-factor', 'phrase:health factor', 'phrase:liquidation risk'],
        classifier_version: CLASSIFIER,
      },
    ],
    reputation: {
      feedback_count: 77,
      client_count: 51,
      summary_value: 9620,
      summary_decimals: 2,
      score: 96.2,
      source: SOURCE,
      computed_at: '2026-08-27T10:00:00.000Z',
    },
  },
  {
    identity: {
      id: '56:900005',
      chain_id: 56,
      agent_id: 900005,
      owner_address: address('e1'),
      wallet_address: address('e2'),
      agent_uri: 'ipfs://example-multi',
      registered_at_block: 118_001_500,
      registered_at: '2026-07-19T11:11:00.000Z',
    },
    profile: {
      name: 'Fjord Treasury Manager',
      description:
        'Rebalances a treasury to its target allocation and rotates idle capital into the best available yield with auto-compound vault strategies.',
      capabilities: ['rebalance', 'yield', 'vault'],
      protocol_tag: 'mcp',
      trait_tags: ['x402-paid', 'multichain', 'declared-active'],
      image_url: 'https://rs.debot.ai/agent/grid.png',
      endpoints: [
        {
          label: 'MCP',
          value: 'https://fjord.example/mcp',
          url: 'https://fjord.example/mcp',
          kind: 'mcp',
          version: '1.0.0',
        },
        {
          label: 'telegram',
          value: 'https://t.me/fjord_treasury',
          url: 'https://t.me/fjord_treasury',
          kind: 'social',
          version: null,
        },
      ],
      trust_models: ['reputation'],
      x402_support: true,
      declared_active: true,
      metadata_resolved_at: '2026-07-19T11:14:00.000Z',
    },
    // Genuinely spans two categories — exercises secondary-category rendering.
    categories: [
      {
        category: 'rebalancing',
        confidence: 1,
        is_primary: true,
        signals: ['capability:rebalance', 'phrase:target allocation'],
        classifier_version: CLASSIFIER,
      },
      {
        category: 'yield-optimization',
        confidence: 0.8,
        is_primary: false,
        signals: ['capability:yield', 'capability:vault', 'phrase:auto-compound'],
        classifier_version: CLASSIFIER,
      },
    ],
    reputation: {
      feedback_count: 23,
      client_count: 17,
      summary_value: 8500,
      summary_decimals: 2,
      score: 85,
      source: SOURCE,
      computed_at: '2026-08-27T10:00:00.000Z',
    },
  },
  {
    identity: {
      id: '56:900006',
      chain_id: 56,
      agent_id: 900006,
      owner_address: address('f1'),
      wallet_address: address('f2'),
      agent_uri: 'ipfs://example-unresolved',
      registered_at_block: 118_002_200,
      registered_at: '2026-08-20T06:05:00.000Z',
    },
    // Metadata never resolved: identity is on-chain and real, the off-chain
    // document is not readable. The UI must show it as partial, not hide it.
    profile: {
      name: 'Agent #900006',
      description: null,
      capabilities: [],
      protocol_tag: 'unconfigured',
      trait_tags: [],
      image_url: null,
      // Nothing is known about this agent's interface, which is distinct from knowing it
      // has none. `metadata_resolved_at: null` below is what tells the two apart.
      endpoints: [],
      trust_models: [],
      x402_support: null,
      declared_active: null,
      metadata_resolved_at: null,
    },
    categories: [
      {
        category: 'uncategorized',
        confidence: 0,
        is_primary: true,
        signals: ['no-signal-match'],
        classifier_version: CLASSIFIER,
      },
    ],
    reputation: null,
  },
];

/**
 * Which fixtures have escrow history, in one place rather than spread through the agents above.
 *
 * Deliberately a minority, matching the real catalogue: 53 of 317,476 indexed agents have a job
 * on the kernel. An escrow panel on every card would give a misleading impression of how common
 * this is, and would never exercise the empty state that most agents actually show.
 */
const MOCK_JOB_EVIDENCE: Record<string, WireAgent['jobs']> = {
  // Delivered repeatedly, with more jobs named than funded.
  '56:900001': jobs(14, 9, 6, '600000000000000000', '900000000000000000'),
  // Funded and delivered every time, a smaller history.
  '56:900002': jobs(4, 4, 2, '120000000000000000', '240000000000000000'),
  // Hired, delivered, and still inside the dispute window on two of them.
  '56:900004': jobs(11, 5, 3, '300000000000000000', '500000000000000000'),
};

const MOCK_AGENTS: WireAgent[] = AGENTS_WITHOUT_JOBS.map((agent) => ({
  ...agent,
  jobs: MOCK_JOB_EVIDENCE[agent.identity.id] ?? null,
}));

const CATEGORY_META: { id: string; label: string; description: string }[] = [
  {
    id: 'rebalancing',
    label: 'Rebalancing',
    description:
      'Monitors a portfolio against a target allocation and trades it back into line when weights drift.',
  },
  {
    id: 'grid-trading',
    label: 'Grid Trading',
    description:
      'Places a ladder of staggered orders across a price range and works the range as the market oscillates.',
  },
  {
    id: 'yield-optimization',
    label: 'Yield Optimization',
    description:
      'Finds and rotates capital toward the strongest risk-adjusted yield, compounding rewards along the way.',
  },
  {
    id: 'health-factor-monitoring',
    label: 'Health Factor Monitoring',
    description:
      'Watches leveraged lending positions and acts or warns before liquidation risk becomes critical.',
  },
];

/** Mirrors the backend's filter and sort semantics closely enough to build against. */
export function mockListAgents(params: ListAgentsParams) {
  let rows = [...MOCK_AGENTS];

  if (params.category) {
    rows = rows.filter((row) => row.categories.some((c) => c.category === params.category));
  }
  if (params.protocol) {
    rows = rows.filter((row) => row.profile.protocol_tag === params.protocol);
  }
  if (params.q) {
    const term = params.q.toLowerCase();
    rows = rows.filter(
      (row) =>
        row.profile.name.toLowerCase().includes(term) ||
        (row.profile.description ?? '').toLowerCase().includes(term),
    );
  }
  if (params.trait && params.trait.length > 0) {
    const required = params.trait;
    rows = rows.filter((row) => required.every((trait) => row.profile.trait_tags.includes(trait)));
  }
  if (params.resolvedOnly === true) {
    rows = rows.filter((row) => row.profile.metadata_resolved_at !== null);
  }

  const direction = params.direction === 'asc' ? 1 : -1;
  rows.sort((a, b) => {
    switch (params.sort) {
      case 'name':
        return a.profile.name.localeCompare(b.profile.name) * direction;
      case 'feedback':
        return (
          ((a.reputation?.feedback_count ?? -1) - (b.reputation?.feedback_count ?? -1)) * direction
        );
      case 'reputation':
        return ((a.reputation?.score ?? -1) - (b.reputation?.score ?? -1)) * direction;
      default:
        return (
          (Date.parse(a.identity.registered_at ?? '0') -
            Date.parse(b.identity.registered_at ?? '0')) *
          direction
        );
    }
  });

  const page = params.page ?? 1;
  const perPage = params.perPage ?? 24;
  const start = (page - 1) * perPage;

  return {
    data: rows.slice(start, start + perPage),
    meta: {
      page,
      per_page: perPage,
      total: rows.length,
      total_pages: Math.max(1, Math.ceil(rows.length / perPage)),
    },
  };
}

export function mockAgentDetail(id: string) {
  const agent = MOCK_AGENTS.find((row) => row.identity.id === id);
  return agent ? { data: agent } : null;
}

export function mockListCategories() {
  const counts = new Map<string, number>();
  for (const agent of MOCK_AGENTS) {
    const primary = agent.categories.find((c) => c.is_primary);
    if (primary) counts.set(primary.category, (counts.get(primary.category) ?? 0) + 1);
  }

  const data = CATEGORY_META.map((meta) => ({ ...meta, agent_count: counts.get(meta.id) ?? 0 }));

  const uncategorized = counts.get('uncategorized') ?? 0;
  if (uncategorized > 0) {
    data.push({
      id: 'uncategorized',
      label: 'Uncategorized',
      description:
        'Indexed agents the classifier could not confidently place in a category. Shown rather than hidden so gaps in the taxonomy stay visible.',
      agent_count: uncategorized,
    });
  }

  return { data, meta: { total_agents: MOCK_AGENTS.length } };
}

/**
 * Live-reputation fixture.
 *
 * Reports `origin: 'snapshot'` because a fixture is by definition not a live chain
 * read, and saying otherwise would train the UI to trust a label it should not.
 */
export function mockReputation(id: string) {
  const agent = MOCK_AGENTS.find((row) => row.identity.id === id);
  if (!agent) return null;

  const reputation = agent.reputation;

  return {
    data: {
      agent_id: id,
      feedback_count: reputation?.feedback_count ?? 0,
      client_count: reputation?.client_count ?? 0,
      summary_value: reputation?.summary_value ?? null,
      summary_decimals: reputation?.summary_decimals ?? null,
      score: reputation?.score ?? null,
      origin: 'snapshot' as const,
      computed_at: reputation?.computed_at ?? new Date().toISOString(),
      notes:
        reputation && reputation.feedback_count > 0
          ? ['Mock data source; not a live registry read.']
          : ['Mock data source; not a live registry read.', 'No client feedback recorded yet.'],
      explorer: null,
    },
  };
}

/**
 * ERC-8183 job fixture, derived from the agent's tally rather than written beside it.
 *
 * Generated so the rows cannot contradict the summary. Writing both by hand is how a fixture
 * ends up listing four jobs under a heading that says nine, which trains the UI against a state
 * the real API never produces.
 *
 * Statuses are laid out to match the counts: completed first, then the ones still inside the
 * dispute window, then the unfunded remainder that was named and never paid for.
 */
export function mockAgentJobs(id: string) {
  const agent = MOCK_AGENTS.find((row) => row.identity.id === id);
  if (!agent) return null;

  const summary = agent.jobs;
  const perJob = (index: number, status: string, submitted: boolean) => ({
    job_id: 90_000 + index,
    chain_id: agent.identity.chain_id,
    status,
    client_address: address('7a'),
    // Unfunded jobs carry a budget that was set and never escrowed, as on chain.
    budget_raw: '100000000000000000',
    description: `Mock job ${String(index + 1)} for ${agent.profile.name}.`,
    expired_at: '2026-09-02T17:39:25.000Z',
    submitted_at: submitted ? '2026-08-24T17:39:37.000Z' : null,
    deliverable_hash: submitted ? `0x${'ab'.repeat(32)}` : null,
  });

  const rows =
    summary === null
      ? []
      : [
          ...Array.from({ length: summary.completed }, (_, i) => perJob(i, 'COMPLETED', true)),
          ...Array.from({ length: summary.awaiting_release }, (_, i) =>
            perJob(summary.completed + i, 'SUBMITTED', true),
          ),
          ...Array.from({ length: summary.total - summary.funded }, (_, i) =>
            perJob(summary.funded + i, 'OPEN', false),
          ),
        ];

  return {
    data: rows,
    meta: {
      chain_id: agent.identity.chain_id,
      commerce_address: address('ea'),
      explorer_url: 'https://bscscan.com',
      token_symbol: 'U',
      token_decimals: 18,
      // Seven days, as on mainnet.
      dispute_window_seconds: 604_800,
      summary:
        summary ??
        jobs(0, 0, 0, '0', '0'),
    },
  };
}

/**
 * Search fixture.
 *
 * Mirrors the deterministic vocabulary of the backend intent parser closely enough
 * to build the interpretation UI against, without duplicating the whole rule set —
 * the real parser lives in KATTEGAT-BE modules/search/search.intent.ts.
 */
export function mockSearch(query: string, page = 1, perPage = 24) {
  const lower = query.toLowerCase();
  const explanation: string[] = [];

  // Typed as the real category union so a typo here is a compile error rather
  // than a filter that silently matches nothing.
  const categoryHints: { category: AgentCategoryId; terms: string[] }[] = [
    { category: 'rebalancing', terms: ['rebalanc', 'allocation', 'portfolio'] },
    { category: 'grid-trading', terms: ['grid', 'range', 'ladder'] },
    { category: 'yield-optimization', terms: ['yield', 'apy', 'compound', 'farm'] },
    { category: 'health-factor-monitoring', terms: ['health factor', 'liquidat', 'collateral'] },
  ];

  let category: AgentCategoryId | null = null;
  for (const hint of categoryHints) {
    const matched = hint.terms.find((term) => lower.includes(term));
    if (matched) {
      category = hint.category;
      explanation.push(`Category "${hint.category}" from "${matched}"`);
      break;
    }
  }

  const protocol = ['a2a', 'mcp'].find((tag) => lower.includes(tag)) ?? null;
  if (protocol) explanation.push(`Protocol "${protocol}"`);

  const trackRecord = /conservative|proven|track record|safe/.test(lower);
  if (trackRecord) explanation.push('Preference for a proven track record');

  if (explanation.length === 0) explanation.push('No structured signals recognised');

  const params: ListAgentsParams = { page, perPage };
  if (category) params.category = category;
  if (protocol) params.protocol = protocol;
  if (trackRecord) params.resolvedOnly = true;

  const result = mockListAgents(params);

  return {
    data: result.data,
    meta: {
      ...result.meta,
      interpretation: {
        query,
        resolved_by: 'rules' as const,
        widened: false,
        filters: {
          text: null,
          category,
          protocol,
          traits: [],
          resolved_only: trackRecord,
          sort: 'registered_at',
          direction: 'desc',
        },
        explanation,
      },
    },
  };
}

/**
 * Stats fixture.
 *
 * Derived from the fixture set rather than invented, so the numbers on the landing
 * page in mock mode are internally consistent with the agents it will show. Feedback
 * counts are summed from the fixtures, not made up.
 */
export function mockStats() {
  const resolved = MOCK_AGENTS.filter((a) => a.profile.metadata_resolved_at !== null).length;
  const active = MOCK_AGENTS.filter((a) => a.profile.trait_tags.includes('declared-active')).length;
  const categories = new Set(
    MOCK_AGENTS.flatMap((a) =>
      a.categories
        .filter((c) => c.is_primary && c.category !== 'uncategorized')
        .map((c) => c.category),
    ),
  );
  const classified = MOCK_AGENTS.filter((a) =>
    a.categories.some((c) => c.is_primary && c.category !== 'uncategorized'),
  ).length;
  const feedback = MOCK_AGENTS.reduce((sum, a) => sum + (a.reputation?.feedback_count ?? 0), 0);
  const rated = MOCK_AGENTS.filter((a) => (a.reputation?.feedback_count ?? 0) > 0).length;

  return {
    data: {
      indexed_agents: MOCK_AGENTS.length,
      declared_active: active,
      with_resolved_metadata: resolved,
      active_categories: categories.size,
      classified_agents: classified,
      feedback_records: feedback,
      rated_agents: rated,
      // Every fixture agent has been swept, so the mock exercises the "whole catalogue" copy.
      reputation_swept: MOCK_AGENTS.length,
      owner_count: new Set(MOCK_AGENTS.map((a) => a.identity.owner_address)).size,
      last_indexed_at: new Date().toISOString(),
    },
  };
}
