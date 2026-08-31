import { z } from 'zod';

/**
 * The KATTEGAT API contract, restated on the client.
 *
 * The backend owns these shapes (KATTEGAT-BE src/modules/agents/agent.schema.ts)
 * and publishes them as OpenAPI at `/docs/json`. They are re-declared here rather
 * than imported because the two repositories deploy independently: a generated
 * client would silently assume the backend it was generated against, whereas
 * parsing every response against a local schema means a contract change surfaces
 * as a clear validation error at the boundary instead of `undefined` deep inside
 * a component.
 *
 * Wire format is snake_case; these schemas map it to camelCase so React code
 * never carries the transport convention.
 */

/**
 * Category ids, mirroring KATTEGAT-BE `modules/classification/taxonomy.ts`.
 *
 * Must stay in step with the backend: these feed a Zod enum, so an id the backend
 * starts returning that is missing here fails validation at the boundary rather
 * than rendering wrong. That is the intended behaviour — a loud, located error —
 * and `live-contract.test.ts` is what catches it.
 */
export const AGENT_CATEGORIES = [
  // The four BNB Agent Studio launch categories.
  'rebalancing',
  'grid-trading',
  'yield-optimization',
  'health-factor-monitoring',
  // Added after measuring what is actually registered on BNB Smart Chain.
  'trading-execution',
  'research-analytics',
  'automation-operations',
  'security-verification',
  'code-smart-contracts',
  'content-media',
  // v3: the largest coherent cluster in the registry — agents that score or vote on AI
  // model outputs. Matched nothing at all before, so it needed a category, not a rule.
  'model-evaluation',
  'uncategorized',
] as const;

export type AgentCategoryId = (typeof AGENT_CATEGORIES)[number];

/**
 * Short display labels.
 *
 * Presentational only — the API is the source of truth for which categories exist
 * and what they contain, and `/categories` ships a full label and description. These
 * are the compact forms used where a badge has no room for "Health Factor
 * Monitoring".
 */
export const CATEGORY_LABELS: Record<AgentCategoryId, string> = {
  rebalancing: 'Rebalancing',
  'grid-trading': 'Grid Trading',
  'yield-optimization': 'Yield',
  'health-factor-monitoring': 'Health Factor',
  'trading-execution': 'Trading',
  'research-analytics': 'Research',
  'automation-operations': 'Automation',
  'security-verification': 'Security',
  'code-smart-contracts': 'Code',
  'content-media': 'Content',
  'model-evaluation': 'Evaluation',
  uncategorized: 'Unclassified',
};

/**
 * The protocol tag as a phrase a visitor can act on.
 *
 * Lives beside `CATEGORY_LABELS` for the same reason: both turn a wire enum into display
 * vocabulary, and both are needed in more than one place. The card and the profile header
 * disagreed while this was a local helper in the card, so the same agent read "A2A
 * endpoint" in the grid and `a2a` on its own page.
 *
 * The enum values leak implementation. `http-api` is punctuated for a database column, and
 * `unconfigured` describes the record rather than the agent. Worse, it conflates two
 * states: an agent whose registration file never resolved is also tagged `unconfigured`,
 * and that is a gap in KATTEGAT's index rather than a fact about the agent, so the caller
 * passes that in separately.
 */
export function describeInterface(protocolTag: string, metadataMissing: boolean): string {
  if (metadataMissing) return 'Interface unknown';

  switch (protocolTag) {
    case 'a2a':
      return 'A2A endpoint';
    case 'mcp':
      return 'MCP server';
    case 'http-api':
      return 'HTTP API';
    case 'custom':
      return 'Custom endpoint';
    default:
      return 'No endpoint';
  }
}

/**
 * Renders a service version the way the operator wrote it.
 *
 * A bare `0.3.0` reads better as `v0.3.0`, but prefixing unconditionally produced
 * `vaacp-platform-v1` on 10,890 endpoints and `v2025-06-18` on 284 more, because those
 * strings are a platform name and a date. Only dotted numerics get the prefix.
 */
export function formatServiceVersion(version: string): string {
  return /^\d+(\.\d+)*$/.test(version) ? `v${version}` : version;
}

/** The launch four, which stay visible in the UI even at zero agents. */
export const LAUNCH_CATEGORIES: readonly AgentCategoryId[] = [
  'rebalancing',
  'grid-trading',
  'yield-optimization',
  'health-factor-monitoring',
];

export const agentIdentitySchema = z
  .object({
    id: z.string(),
    chain_id: z.number(),
    agent_id: z.number(),
    owner_address: z.string(),
    wallet_address: z.string().nullable(),
    agent_uri: z.string().nullable(),
    registered_at_block: z.number().nullable(),
    registered_at: z.string().nullable(),
  })
  .transform((raw) => ({
    id: raw.id,
    chainId: raw.chain_id,
    agentId: raw.agent_id,
    ownerAddress: raw.owner_address,
    walletAddress: raw.wallet_address,
    agentUri: raw.agent_uri,
    registeredAtBlock: raw.registered_at_block,
    registeredAt: raw.registered_at,
  }));

export const ENDPOINT_KINDS = ['a2a', 'mcp', 'web', 'wallet', 'social', 'other'] as const;

export type EndpointKind = (typeof ENDPOINT_KINDS)[number];

/**
 * One entry from the agent's `services` array: where the agent can actually be reached.
 *
 * `value` and `url` are deliberately separate. `value` is what the operator published and
 * is always displayed, including when it is a CAIP-10 contract reference or an `mcp://`
 * scheme rather than a URL. `url` is set only when the backend judged the value safe to
 * put in an `href`, so a `javascript:` endpoint is still shown but is never clickable.
 */
export const agentEndpointSchema = z.object({
  label: z.string().nullable(),
  value: z.string(),
  url: z.string().nullable(),
  kind: z.enum(ENDPOINT_KINDS),
  version: z.string().nullable(),
});

export type AgentEndpoint = z.infer<typeof agentEndpointSchema>;

export const agentProfileSchema = z
  .object({
    name: z.string(),
    description: z.string().nullable(),
    capabilities: z.array(z.string()),
    protocol_tag: z.string(),
    trait_tags: z.array(z.string()),
    /**
     * The agent's own artwork from its registration file, or null.
     *
     * The backend guarantees an absolute `https:` URL or null — the value originates on
     * chain, so it is validated there rather than trusted here. Still needs a fallback in
     * the UI: the host is a third party and may be unreachable.
     */
    image_url: z.string().nullable(),
    endpoints: z.array(agentEndpointSchema),
    trust_models: z.array(z.string()),
    x402_support: z.boolean().nullable(),
    declared_active: z.boolean().nullable(),
    metadata_resolved_at: z.string().nullable(),
  })
  .transform((raw) => ({
    name: raw.name,
    description: raw.description,
    capabilities: raw.capabilities,
    protocolTag: raw.protocol_tag,
    traitTags: raw.trait_tags,
    imageUrl: raw.image_url,
    endpoints: raw.endpoints,
    trustModels: raw.trust_models,
    x402Support: raw.x402_support,
    declaredActive: raw.declared_active,
    /** Null means the off-chain registration file never resolved. */
    metadataResolvedAt: raw.metadata_resolved_at,
  }));

export const agentCategorySchema = z
  .object({
    category: z.enum(AGENT_CATEGORIES),
    confidence: z.number(),
    is_primary: z.boolean(),
    signals: z.array(z.string()),
    classifier_version: z.string(),
  })
  .transform((raw) => ({
    category: raw.category,
    confidence: raw.confidence,
    isPrimary: raw.is_primary,
    /** The evidence behind the assignment, rendered in the UI verbatim. */
    signals: raw.signals,
    classifierVersion: raw.classifier_version,
  }));

export const agentReputationSchema = z
  .object({
    feedback_count: z.number(),
    client_count: z.number(),
    summary_value: z.number().nullable(),
    summary_decimals: z.number().nullable(),
    score: z.number().nullable(),
    source: z.string(),
    computed_at: z.string(),
  })
  .transform((raw) => ({
    feedbackCount: raw.feedback_count,
    clientCount: raw.client_count,
    /** Raw fixed-point pair from the ERC-8004 registry, preserved for display. */
    summaryValue: raw.summary_value,
    summaryDecimals: raw.summary_decimals,
    /**
     * Decoded score on the 0–100 scale ERC-8004 defines — never 0–5.
     *
     * Null covers every case where no score can be stated: no feedback at all, an
     * incomplete fixed-point pair, or a recorded value outside 0–100. The registry field
     * is generic enough to hold a latency or a cost, so an out-of-range value is not a
     * rating and the backend refuses to present it as one. None of these is a zero.
     */
    score: raw.score,
    source: raw.source,
    computedAt: raw.computed_at,
  }));

export const agentSchema = z.object({
  identity: agentIdentitySchema,
  profile: agentProfileSchema,
  categories: z.array(agentCategorySchema),
  reputation: agentReputationSchema.nullable(),
});

export const paginationSchema = z
  .object({
    page: z.number(),
    per_page: z.number(),
    total: z.number(),
    total_pages: z.number(),
  })
  .transform((raw) => ({
    page: raw.page,
    perPage: raw.per_page,
    total: raw.total,
    totalPages: raw.total_pages,
  }));

export const listAgentsResponseSchema = z.object({
  data: z.array(agentSchema),
  meta: paginationSchema,
});

export const agentDetailResponseSchema = z.object({ data: agentSchema });

export const categorySchema = z
  .object({
    id: z.enum(AGENT_CATEGORIES),
    label: z.string(),
    description: z.string(),
    agent_count: z.number(),
  })
  .transform((raw) => ({
    id: raw.id,
    label: raw.label,
    description: raw.description,
    agentCount: raw.agent_count,
  }));

export const listCategoriesResponseSchema = z.object({
  data: z.array(categorySchema),
  meta: z.object({ total_agents: z.number() }).transform((raw) => ({
    totalAgents: raw.total_agents,
  })),
});

/* ------------------------------ reputation -------------------------------- */

/**
 * Live reputation read, from `GET /agents/:id/reputation`.
 *
 * Distinct from the snapshot embedded in an agent record: this endpoint reads the
 * registry directly, and `origin` says whether it succeeded (`chain`) or fell back
 * to the cached copy (`snapshot`). `notes` carries the plain-language reason,
 * which the UI shows verbatim rather than inventing its own explanation.
 */
export const reputationDetailSchema = z
  .object({
    agent_id: z.string(),
    feedback_count: z.number(),
    client_count: z.number(),
    summary_value: z.number().nullable(),
    summary_decimals: z.number().nullable(),
    score: z.number().nullable(),
    origin: z.enum(['chain', 'snapshot', 'explorer']),
    computed_at: z.string(),
    notes: z.array(z.string()),
    explorer: z
      .object({
        score: z.number().nullable(),
        confidence: z.string().nullable(),
        formula_version: z.string().nullable(),
        sub_scores: z.object({
          feedback: z.number().nullable(),
          validation: z.number().nullable(),
          sybil_resistance: z.number().nullable(),
          reliability: z.number().nullable(),
        }),
      })
      .nullable(),
  })
  .transform((raw) => ({
    agentId: raw.agent_id,
    feedbackCount: raw.feedback_count,
    clientCount: raw.client_count,
    summaryValue: raw.summary_value,
    summaryDecimals: raw.summary_decimals,
    score: raw.score,
    origin: raw.origin,
    computedAt: raw.computed_at,
    notes: raw.notes,
    explorer: raw.explorer
      ? {
          score: raw.explorer.score,
          confidence: raw.explorer.confidence,
          formulaVersion: raw.explorer.formula_version,
          subScores: {
            feedback: raw.explorer.sub_scores.feedback,
            validation: raw.explorer.sub_scores.validation,
            sybilResistance: raw.explorer.sub_scores.sybil_resistance,
            reliability: raw.explorer.sub_scores.reliability,
          },
        }
      : null,
  }));

export const reputationResponseSchema = z.object({ data: reputationDetailSchema });

/* -------------------------------- search ---------------------------------- */

/**
 * How the backend understood a natural-language query.
 *
 * Surfaced so a user can see and correct a misreading rather than wondering why
 * a result appeared — the same "no black box" rule the classification signals follow.
 */
export const searchInterpretationSchema = z
  .object({
    query: z.string(),
    resolved_by: z.enum(['rules', 'ai-assisted']),
    /**
     * True when the residual free text was dropped so the query would return something.
     *
     * Surfaced because the alternative is showing results that do not match the filters the
     * interpretation panel claims were applied.
     */
    widened: z.boolean(),
    filters: z.object({
      text: z.string().nullable(),
      category: z.enum(AGENT_CATEGORIES).nullable(),
      protocol: z.string().nullable(),
      traits: z.array(z.string()),
      resolved_only: z.boolean(),
      sort: z.string(),
      direction: z.string(),
    }),
    explanation: z.array(z.string()),
  })
  .transform((raw) => ({
    query: raw.query,
    resolvedBy: raw.resolved_by,
    widened: raw.widened,
    filters: {
      text: raw.filters.text,
      category: raw.filters.category,
      protocol: raw.filters.protocol,
      traits: raw.filters.traits,
      resolvedOnly: raw.filters.resolved_only,
      sort: raw.filters.sort,
      direction: raw.filters.direction,
    },
    explanation: raw.explanation,
  }));

export const searchResponseSchema = z.object({
  data: z.array(agentSchema),
  meta: z
    .object({
      page: z.number(),
      per_page: z.number(),
      total: z.number(),
      total_pages: z.number(),
      interpretation: searchInterpretationSchema,
    })
    .transform((raw) => ({
      page: raw.page,
      perPage: raw.per_page,
      total: raw.total,
      totalPages: raw.total_pages,
      interpretation: raw.interpretation,
    })),
});

/* --------------------------------- stats ---------------------------------- */

/**
 * Marketplace counts for the landing page.
 *
 * Note what is absent: no volume, no success rate, no performance. ERC-8004 exposes
 * none of those. `declaredActive` is the agent's own claim from its registration
 * file, not an observation — the UI must label it as such.
 */
export const ecosystemStatsSchema = z
  .object({
    indexed_agents: z.number(),
    declared_active: z.number(),
    with_resolved_metadata: z.number(),
    active_categories: z.number(),
    classified_agents: z.number(),
    feedback_records: z.number(),
    rated_agents: z.number(),
    /**
     * Agents whose reputation has been read from the registry.
     *
     * The denominator for the two figures above. Without it a client cannot tell "nobody has
     * rated these agents" from "we have not looked yet", and those are different claims.
     */
    reputation_swept: z.number(),
    owner_count: z.number(),
    last_indexed_at: z.string().nullable(),
  })
  .transform((raw) => ({
    indexedAgents: raw.indexed_agents,
    declaredActive: raw.declared_active,
    withResolvedMetadata: raw.with_resolved_metadata,
    activeCategories: raw.active_categories,
    classifiedAgents: raw.classified_agents,
    feedbackRecords: raw.feedback_records,
    ratedAgents: raw.rated_agents,
    reputationSwept: raw.reputation_swept,
    ownerCount: raw.owner_count,
    lastIndexedAt: raw.last_indexed_at,
  }));

export const ecosystemStatsResponseSchema = z.object({ data: ecosystemStatsSchema });

/** Error envelope. `code` is stable and safe to branch on for UX. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    request_id: z.string(),
  }),
});

export type EcosystemStats = z.output<typeof ecosystemStatsSchema>;
export type ReputationDetail = z.output<typeof reputationDetailSchema>;
export type SearchInterpretation = z.output<typeof searchInterpretationSchema>;
export type SearchResponse = z.output<typeof searchResponseSchema>;
export type Agent = z.output<typeof agentSchema>;
export type AgentIdentity = z.output<typeof agentIdentitySchema>;
export type AgentProfile = z.output<typeof agentProfileSchema>;
export type AgentCategoryAssignment = z.output<typeof agentCategorySchema>;
export type AgentReputation = z.output<typeof agentReputationSchema>;
export type Pagination = z.output<typeof paginationSchema>;
export type Category = z.output<typeof categorySchema>;
export type ListAgentsResponse = z.output<typeof listAgentsResponseSchema>;
export type ListCategoriesResponse = z.output<typeof listCategoriesResponseSchema>;

/** Query parameters accepted by `GET /api/v1/agents`. */
export interface ListAgentsParams {
  category?: AgentCategoryId;
  protocol?: string;
  q?: string;
  trait?: string[];
  resolvedOnly?: boolean;
  minConfidence?: number;
  sort?: 'registered_at' | 'reputation' | 'name' | 'feedback';
  direction?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
}
