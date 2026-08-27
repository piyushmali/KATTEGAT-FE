import Link from 'next/link';
import { ExternalLink, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { Badge, type BadgeTone } from '../../components/ui/badge';
import { agentIdentityUrl, truncateAddress } from '../../lib/web3/chain';
import type { Agent, AgentCategoryAssignment } from '../../lib/api/contract';

/**
 * The marketplace's primary unit of discovery.
 *
 * Answers the question a browsing user is actually asking — "what is this and can
 * I trust it?" — in scanning order: what it does, how it is classified, how much
 * verified feedback exists, and whether its metadata is even complete.
 *
 * Deliberately shows absence. An agent with no feedback says "No feedback yet"
 * rather than a 0, and an agent whose registration file failed to resolve is
 * labelled as such rather than quietly rendered as an empty card. Overstating
 * confidence is the one failure mode a trust layer cannot afford.
 */

const CATEGORY_LABELS: Record<string, string> = {
  rebalancing: 'Rebalancing',
  'grid-trading': 'Grid Trading',
  'yield-optimization': 'Yield Optimization',
  'health-factor-monitoring': 'Health Factor',
  uncategorized: 'Uncategorized',
};

/** Traits that carry a genuine trust signal get colour; the rest stay neutral. */
const TRAIT_TONES: Record<string, BadgeTone> = {
  'tee-attested': 'info',
  'x402-paid': 'accent',
  multichain: 'neutral',
  'declared-active': 'positive',
  'reputation-trust': 'neutral',
  'crypto-economic-trust': 'neutral',
};

function formatScore(score: number | null): string | null {
  if (score === null) return null;
  return score.toFixed(2);
}

function primaryCategory(categories: AgentCategoryAssignment[]): AgentCategoryAssignment | null {
  return categories.find((entry) => entry.isPrimary) ?? categories[0] ?? null;
}

export function AgentCard({ agent }: { agent: Agent }) {
  const primary = primaryCategory(agent.categories);
  const secondary = agent.categories.filter((entry) => !entry.isPrimary);
  const score = formatScore(agent.reputation?.score ?? null);
  const feedbackCount = agent.reputation?.feedbackCount ?? 0;
  const metadataMissing = agent.profile.metadataResolvedAt === null;

  return (
    <article className="group relative flex flex-col rounded-card border border-line-subtle bg-surface-raised p-4 transition-colors hover:border-line-strong hover:bg-surface-overlay">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-sm font-semibold text-content-primary">
          {/* Whole card is the hit area; the link stays the accessible name. */}
          <Link href={`/agents/${encodeURIComponent(agent.identity.id)}`} className="block truncate">
            <span className="absolute inset-0" aria-hidden="true" />
            {agent.profile.name}
          </Link>
        </h3>

        {primary && primary.category !== 'uncategorized' ? (
          <Badge tone="accent">{CATEGORY_LABELS[primary.category] ?? primary.category}</Badge>
        ) : (
          <Badge tone="neutral" title="KATTEGAT could not confidently classify this agent">
            Uncategorized
          </Badge>
        )}
      </div>

      <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-content-muted">
        {agent.profile.description ??
          (metadataMissing
            ? 'Registration metadata could not be resolved from this agent’s URI.'
            : 'No description provided.')}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge tone="neutral" title="Agent communication protocol">
          {agent.profile.protocolTag}
        </Badge>
        {agent.profile.traitTags.slice(0, 2).map((trait) => (
          <Badge key={trait} tone={TRAIT_TONES[trait] ?? 'neutral'}>
            {trait}
          </Badge>
        ))}
        {secondary.length > 0 ? (
          <Badge
            tone="neutral"
            title={secondary
              .map((entry) => CATEGORY_LABELS[entry.category] ?? entry.category)
              .join(', ')}
          >
            +{secondary.length} more
          </Badge>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line-subtle pt-3 text-2xs">
        <span className="inline-flex items-center gap-1.5 text-content-faint">
          {metadataMissing ? (
            <ShieldQuestion className="size-3.5 text-caution" aria-hidden="true" />
          ) : (
            <ShieldCheck className="size-3.5 text-content-faint" aria-hidden="true" />
          )}
          <span className="font-mono">{truncateAddress(agent.identity.ownerAddress, 3)}</span>
        </span>

        {score !== null ? (
          <span className="text-content-secondary">
            <span className="font-semibold text-content-primary">{score}</span>
            <span className="text-content-faint">
              {' '}
              from {feedbackCount} {feedbackCount === 1 ? 'review' : 'reviews'}
            </span>
          </span>
        ) : (
          // Absence of feedback is information, not a zero.
          <span className="text-content-faint">No feedback yet</span>
        )}
      </div>

      {/* Sits above the card-wide overlay link so it stays independently clickable. */}
      <a
        href={agentIdentityUrl(agent.identity.agentId)}
        target="_blank"
        rel="noreferrer noopener"
        onClick={(event) => {
          event.stopPropagation();
        }}
        className="relative z-10 mt-3 inline-flex w-fit items-center gap-1 text-2xs text-content-faint hover:text-accent"
        aria-label={`View agent ${String(agent.identity.agentId)} on BscScan`}
      >
        <ExternalLink className="size-3" aria-hidden="true" />
        on-chain #{agent.identity.agentId}
      </a>
    </article>
  );
}
