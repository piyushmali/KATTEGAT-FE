import Link from 'next/link';
import { ArrowUpRight, ShieldQuestion } from 'lucide-react';
import { AgentImage } from '../../components/ui/agent-image';
import { Badge, StatusDot } from '../../components/ui/badge';
import { CATEGORY_LABELS, type Agent, type AgentCategoryAssignment } from '../../lib/api/contract';
import { formatScore } from '../../lib/utils/format';
import { truncateAddress } from '../../lib/web3/chain';

/**
 * The marketplace's primary unit of discovery.
 *
 * Answers, in scanning order, the questions a browsing user actually has: what is this,
 * what does it do, is it live, what does it speak, and what evidence exists. Everything
 * else belongs on the profile.
 *
 * COMPOSITION
 *
 * The name is set in the display serif and given real size, because in a grid of
 * twenty-four the name is what the eye is hunting for and it should win outright.
 * Everything under it is quiet by comparison.
 *
 * Capabilities are dot-separated text rather than chips. An earlier revision rendered
 * up to three capabilities, three traits and a category as badges, which meant a single
 * card could carry seven pills and a full grid became confetti — the badges stopped
 * reading as signals precisely because everything was one. Chips are now reserved for
 * things that genuinely change a decision: an unresolvable registration file, a TEE
 * attestation, a paid endpoint.
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
    <article
      className={[
        'group relative isolate flex flex-col rounded-card border border-line bg-surface-raised',
        // Only compositor properties move, so a 24-card grid stays smooth on hover.
        'transition-[transform,border-color,background-color,box-shadow] duration-300 ease-fjord',
        'hover:-translate-y-0.5 hover:border-line-strong hover:bg-surface-overlay/40 hover:shadow-cast',
        // Keyboard parity: the card reacts when the link inside it is focused.
        'focus-within:-translate-y-0.5 focus-within:border-line-strong',
      ].join(' ')}
    >
      {/*
       * A light that catches the top edge on approach. The same one-pixel highlight the
       * panels use, revealed rather than permanent, which is what makes the card feel
       * like it is lifting toward a light source instead of just changing colour.
       */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-dim/50 to-transparent opacity-0 transition-opacity duration-300 ease-fjord group-hover:opacity-100"
        aria-hidden="true"
      />

      <div className="flex flex-1 flex-col p-5">
        {/* ------------------------------ identity ----------------------------- */}
        <div className="flex items-start justify-between gap-3">
          {/*
           * The agent's own artwork where it published one, its generated mark otherwise.
           * Both render at identical size so the grid keeps its rhythm either way.
           */}
          <AgentImage
            agentId={agent.identity.id}
            name={agent.profile.name}
            imageUrl={agent.profile.imageUrl}
            size="md"
          />

          {/* Category as an eyebrow, not a chip: it is orientation, not a signal. */}
          {classified ? (
            <span className="eyebrow shrink-0 text-right text-amber/80">
              {CATEGORY_LABELS[primary.category]}
            </span>
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

        {/*
         * The name. Set in the serif and allowed two lines before truncating, because a
         * clipped name is the one thing on this card a user cannot work around.
         */}
        <h3 className="display mt-4 text-lg leading-tight text-ink transition-colors duration-300 group-hover:text-amber-bright">
          {/* The whole card is the hit area; the link keeps the accessible name. */}
          <Link href={`/agents/${encodeURIComponent(agent.identity.id)}`} className="line-clamp-2">
            <span className="absolute inset-0 z-10 rounded-card" aria-hidden="true" />
            {agent.profile.name}
          </Link>
        </h3>

        <div className="mt-2 flex items-center gap-2">
          {declaredActive ? (
            <StatusDot tone="positive" label="Declared active" className="text-3xs" />
          ) : (
            <span className="text-3xs text-ink-faint">Status not declared</span>
          )}
          <span className="text-line-strong" aria-hidden="true">
            /
          </span>
          <span className="font-mono text-3xs text-ink-faint">{agent.profile.protocolTag}</span>
        </div>

        {/* ----------------------------- description --------------------------- */}
        <p className="mt-4 line-clamp-2 min-h-9 text-xs leading-5 text-ink-muted">
          {agent.profile.description ??
            (metadataMissing
              ? 'Registration metadata could not be resolved from this agent’s URI.'
              : 'No description published.')}
        </p>

        {/* ---------------------------- capabilities --------------------------- */}
        <div className="mt-auto pt-4">
          {capabilities.length > 0 ? (
            <p className="truncate text-2xs text-ink-secondary">
              {capabilities.map((capability, index) => (
                <span key={capability}>
                  {index > 0 ? (
                    <span className="text-line-strong" aria-hidden="true">
                      {' · '}
                    </span>
                  ) : null}
                  {capability}
                </span>
              ))}
              {extraCapabilities > 0 ? (
                <span className="text-ink-faint"> +{extraCapabilities}</span>
              ) : null}
            </p>
          ) : metadataMissing ? (
            <Badge tone="caution">
              <ShieldQuestion className="size-3" aria-hidden="true" />
              Metadata unresolved
            </Badge>
          ) : (
            <span className="text-2xs text-ink-faint">No capabilities declared</span>
          )}

          {/* Chips only for things that change a decision. */}
          {traits.length > 0 || secondaryCount > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {traits.map((entry) => (
                <Badge key={entry.trait} tone={entry.tone}>
                  {entry.label}
                </Badge>
              ))}
              {secondaryCount > 0 ? (
                <span
                  className="text-3xs text-ink-faint"
                  title={agent.categories
                    .filter((entry) => !entry.isPrimary)
                    .map((entry) => CATEGORY_LABELS[entry.category])
                    .join(', ')}
                >
                  +{secondaryCount} more {secondaryCount === 1 ? 'category' : 'categories'}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* ------------------------- evidence / footer ------------------------- */}
      <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
        <div className="min-w-0">
          {score !== null ? (
            <div className="flex items-baseline gap-1.5">
              {/* 0–100, per ERC-8004. The unit is stated so the figure cannot be
                  mistaken for a five-star rating at a glance. */}
              <span className="display tabular text-xl text-ink">{formatScore(score)}</span>
              <span className="text-3xs text-ink-faint">
                <span className="text-line-strong">/100</span> · {feedbackCount}{' '}
                {feedbackCount === 1 ? 'review' : 'reviews'}
                {clientCount > 0 ? ` · ${String(clientCount)} clients` : ''}
              </span>
            </div>
          ) : (
            // Never "0". Absence of evidence is its own state, and saying so plainly is
            // the product's entire position.
            <span className="text-2xs text-ink-faint">No feedback yet</span>
          )}
          <p className="mt-1 truncate font-mono text-3xs text-ink-faint">
            #{agent.identity.agentId} · {truncateAddress(agent.identity.ownerAddress, 3)}
          </p>
        </div>

        <span
          className="inline-flex shrink-0 items-center gap-1 text-2xs font-medium text-ink-faint transition-all duration-300 ease-fjord group-hover:gap-1.5 group-hover:text-amber"
          aria-hidden="true"
        >
          View
          <ArrowUpRight className="size-3" />
        </span>
      </div>
    </article>
  );
}
