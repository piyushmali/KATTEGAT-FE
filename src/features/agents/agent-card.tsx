import Link from 'next/link';
import { ArrowUpRight, ShieldQuestion, Sparkles } from 'lucide-react';
import { AgentAvatar } from '../../components/ui/agent-avatar';
import { Badge } from '../../components/ui/badge';
import { CATEGORY_LABELS, type Agent, type AgentCategoryAssignment } from '../../lib/api/contract';
import { truncateAddress } from '../../lib/web3/chain';

/**
 * The marketplace's primary unit of discovery.
 *
 * Answers, in scanning order, the questions a browsing user actually has: what is
 * this, what does it do, is it live, what does it speak, and what evidence exists.
 * Everything else belongs on the profile.
 *
 * Two honesty rules it enforces:
 *  - An agent with no feedback reads "No feedback yet", never a 0 score. Absence of
 *    evidence and a bad score are different claims.
 *  - An agent whose off-chain metadata failed to resolve is labelled as partial and
 *    still shown. Its on-chain identity is verified; only the description is missing.
 */

/** Traits worth surfacing on a card, in priority order. The rest live on the profile. */
const TRAIT_PRIORITY: { trait: string; label: string; tone: 'info' | 'amber' | 'neutral' }[] = [
  { trait: 'tee-attested', label: 'TEE attested', tone: 'info' },
  { trait: 'x402-paid', label: 'x402', tone: 'amber' },
  { trait: 'multichain', label: 'Multichain', tone: 'neutral' },
];

function primaryOf(categories: AgentCategoryAssignment[]): AgentCategoryAssignment | null {
  return categories.find((entry) => entry.isPrimary) ?? categories[0] ?? null;
}

export function AgentCard({ agent }: { agent: Agent }) {
  const primary = primaryOf(agent.categories);
  const secondaryCount = agent.categories.filter((entry) => !entry.isPrimary).length;
  const classified = primary !== null && primary.category !== 'uncategorized';

  const score = agent.reputation?.score ?? null;
  const feedbackCount = agent.reputation?.feedbackCount ?? 0;
  const clientCount = agent.reputation?.clientCount ?? 0;

  const metadataMissing = agent.profile.metadataResolvedAt === null;
  const declaredActive = agent.profile.traitTags.includes('declared-active');

  const traits = TRAIT_PRIORITY.filter((entry) => agent.profile.traitTags.includes(entry.trait));
  const capabilities = agent.profile.capabilities.slice(0, 3);
  const extraCapabilities = agent.profile.capabilities.length - capabilities.length;

  return (
    <article className="group relative flex flex-col rounded-panel border border-line bg-surface-raised transition-colors hover:border-line-strong hover:bg-surface-overlay/50">
      <div className="flex flex-1 flex-col p-4">
        {/* ------------------------------ identity ----------------------------- */}
        <div className="flex items-start gap-3">
          <AgentAvatar agentId={agent.identity.id} name={agent.profile.name} size="md" />

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[0.8125rem] leading-5 font-semibold text-ink">
              {/* The whole card is the hit area; the link keeps the accessible name. */}
              <Link href={`/agents/${encodeURIComponent(agent.identity.id)}`}>
                <span className="absolute inset-0 rounded-panel" aria-hidden="true" />
                {agent.profile.name}
              </Link>
            </h3>
            <div className="mt-1 flex items-center gap-1.5">
              {declaredActive ? (
                <span className="inline-flex items-center gap-1 text-3xs text-ink-muted">
                  <span className="size-1 rounded-pill bg-positive" aria-hidden="true" />
                  Declared active
                </span>
              ) : (
                <span className="text-3xs text-ink-faint">Status not declared</span>
              )}
              <span className="text-ink-faint" aria-hidden="true">
                ·
              </span>
              <span className="font-mono text-3xs text-ink-faint">
                {agent.profile.protocolTag}
              </span>
            </div>
          </div>

          {classified ? (
            <Badge tone="amber" className="shrink-0">
              {CATEGORY_LABELS[primary.category]}
            </Badge>
          ) : (
            <Badge
              tone="outline"
              className="shrink-0"
              title="KATTEGAT could not place this agent from its declared capabilities"
            >
              Unclassified
            </Badge>
          )}
        </div>

        {/* ----------------------------- description --------------------------- */}
        <p className="mt-3 line-clamp-2 min-h-8 text-xs leading-4 text-ink-muted">
          {agent.profile.description ??
            (metadataMissing
              ? 'Registration metadata could not be resolved from this agent’s URI.'
              : 'No description published.')}
        </p>

        {/* ---------------------------- capabilities --------------------------- */}
        {capabilities.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-1">
            {capabilities.map((capability) => (
              <Badge key={capability} tone="neutral" className="max-w-[11rem] truncate">
                {capability}
              </Badge>
            ))}
            {extraCapabilities > 0 ? (
              <span className="text-3xs text-ink-faint">+{extraCapabilities}</span>
            ) : null}
          </div>
        ) : metadataMissing ? (
          <div className="mt-3">
            <Badge tone="caution">
              <ShieldQuestion className="size-3" aria-hidden="true" />
              Metadata unresolved
            </Badge>
          </div>
        ) : (
          <div className="mt-3">
            <span className="text-3xs text-ink-faint">No capabilities declared</span>
          </div>
        )}

        {/* --------------------------- trait signals --------------------------- */}
        {traits.length > 0 || secondaryCount > 0 ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-1">
            {traits.map((entry) => (
              <Badge key={entry.trait} tone={entry.tone}>
                {entry.label}
              </Badge>
            ))}
            {secondaryCount > 0 ? (
              <span
                className="inline-flex items-center gap-1 text-3xs text-ink-faint"
                title={agent.categories
                  .filter((entry) => !entry.isPrimary)
                  .map((entry) => CATEGORY_LABELS[entry.category])
                  .join(', ')}
              >
                <Sparkles className="size-2.5" aria-hidden="true" />
                {secondaryCount} more {secondaryCount === 1 ? 'category' : 'categories'}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* ------------------------- evidence / footer ------------------------- */}
      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
        <div className="min-w-0">
          {score !== null ? (
            <div className="flex items-baseline gap-1.5">
              <span className="tabular text-sm font-semibold text-ink">{score.toFixed(2)}</span>
              <span className="text-3xs text-ink-faint">
                {feedbackCount} {feedbackCount === 1 ? 'review' : 'reviews'}
                {clientCount > 0 ? ` · ${String(clientCount)} clients` : ''}
              </span>
            </div>
          ) : (
            // Never "0". Absence of evidence is its own state.
            <span className="text-2xs text-ink-faint">No feedback yet</span>
          )}
          <p className="mt-0.5 truncate font-mono text-3xs text-ink-faint">
            #{agent.identity.agentId} · {truncateAddress(agent.identity.ownerAddress, 3)}
          </p>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1 text-2xs font-medium text-ink-muted transition-colors group-hover:text-amber">
          View
          <ArrowUpRight className="size-3" aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}
