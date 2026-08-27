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

export const AGENT_CATEGORIES = [
  'rebalancing',
  'grid-trading',
  'yield-optimization',
  'health-factor-monitoring',
  'uncategorized',
] as const;

export type AgentCategoryId = (typeof AGENT_CATEGORIES)[number];

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

export const agentProfileSchema = z
  .object({
    name: z.string(),
    description: z.string().nullable(),
    capabilities: z.array(z.string()),
    protocol_tag: z.string(),
    trait_tags: z.array(z.string()),
    metadata_resolved_at: z.string().nullable(),
  })
  .transform((raw) => ({
    name: raw.name,
    description: raw.description,
    capabilities: raw.capabilities,
    protocolTag: raw.protocol_tag,
    traitTags: raw.trait_tags,
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
    /** Decoded score. Null means no feedback at all, which is not a zero score. */
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

/** Error envelope. `code` is stable and safe to branch on for UX. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    request_id: z.string(),
  }),
});

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
