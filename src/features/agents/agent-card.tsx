import Link from 'next/link';
import { ArrowUpRight, Coins, ShieldQuestion } from 'lucide-react';
import { AgentImage } from '../../components/ui/agent-image';
import { Badge, StatusDot } from '../../components/ui/badge';
import {
  CATEGORY_LABELS,
  describeInterface,
  displayCategory,
  type Agent,
} from '../../lib/api/contract';
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

/**
 * Where the agent can be reached, in as few characters as the card can afford.
 *
 * Exists because the middle of this card used to print "No capabilities declared" for a
 * very large share of the grid — most agents that publish a working endpoint never fill in
 * a capability list — and a card whose only middle line is a negative reads as a broken
 * record. The endpoint was sitting in the same payload the whole time.
 *
 * Prefers the operator's own label, falls back to the host, and only then to the raw value.
 * The host is the useful part of a URL at this size: a path tells a scanning reader nothing
 * and spends the line it is printed on.
 */
function reachableAt(endpoints: Agent['profile']['endpoints']): string | null {
  const endpoint =
    endpoints.find((entry) => entry.kind === 'a2a' || entry.kind === 'mcp') ?? endpoints[0];
  if (!endpoint) return null;

  if (endpoint.label !== null && endpoint.label.length > 0) return endpoint.label;

  if (endpoint.url !== null) {
    try {
      /*
       * Two ways this does not yield a host, and both fall through rather than render blank.
       *
       * `new URL` throws only on a value with no scheme at all. It happily parses anything
       * else, including the `mcp://` and `eip155:` forms the registry is full of — but for a
       * scheme with no authority component, `host` comes back as the empty string. Returning
       * that would print nothing where a fact was promised, which is worse than printing the
       * raw value the operator published.
       */
      const { host } = new URL(endpoint.url);
      if (host.length > 0) return host;
    } catch {
      /* no scheme; the raw value is the best available answer */
    }
  }

  return endpoint.value.length > 0 ? endpoint.value : null;
}

/**
 * The escrow line for the footer, or null when there is nothing honest to put there.
 *
 * Three cases, not two. An agent can have escrow funded against it and nothing released yet,
 * because delivered work is held for the dispute window — seven days on mainnet. Leading with
 * "0 U paid" in that case would read as a failure to deliver when it is a timer running, so the
 * funded count leads instead and the amount waits until it has actually moved.
 */
function describePaidWork(jobs: Agent['jobs']): { headline: string; detail: string } | null {
  if (jobs === null || jobs.funded === 0) return null;

  if (jobs.completed === 0) {
    return {
      headline: `${String(jobs.funded)} funded`,
      detail: jobs.awaitingRelease > 0 ? 'delivered, in dispute window' : 'escrow held',
    };
  }

  return {
    headline: `${jobs.settled} ${jobs.tokenSymbol}`,
    detail: `paid · ${String(jobs.completed)} ${jobs.completed === 1 ? 'job' : 'jobs'}`,
  };
}

/**
 * How much evidence stands behind this agent, from 0 to 1.
 *
 * Not a score, and deliberately not presented as one. It is a measure of how much there is to
 * look at, which is a different claim from how good the agent is — an agent with forty pieces
 * of mediocre feedback has more evidence than one with a single glowing review, and this says
 * so. Nothing here is derived from the *content* of the feedback.
 *
 * Escrow outweighs feedback because a funded job is a budget that was locked on chain and
 * released, while a score is what a client typed afterwards. Both saturate quickly: the
 * difference between zero and one funded job matters enormously, and the difference between
 * forty and eighty reviews does not, so the curve is deliberately steep at the bottom.
 *
 * Returns 0 for an agent with nothing recorded, which draws no gauge at all rather than a
 * sliver. Absence of evidence has to look like absence.
 */
function evidenceStrength(agent: Agent): number {
  const jobs = agent.jobs;
  const funded = jobs?.funded ?? 0;
  const completed = jobs?.completed ?? 0;
  const feedback = agent.reputation?.feedbackCount ?? 0;
  const clients = agent.reputation?.clientCount ?? 0;

  if (funded === 0 && feedback === 0) return 0;

  // Each term saturates on its own so one very active agent cannot flatten the whole grid.
  const escrow = Math.min(funded / 3, 1) * 0.4 + Math.min(completed / 3, 1) * 0.2;
  const reputation = Math.min(feedback / 12, 1) * 0.28 + Math.min(clients / 6, 1) * 0.12;

  // Floored so anything with any evidence at all is visible rather than a hairline of nothing.
  return Math.max(0.08, Math.min(escrow + reputation, 1));
}

export function AgentCard({ agent }: { agent: Agent }) {
  const { classified, label: categoryLabel } = displayCategory(agent.categories);
  const secondaryCount = agent.categories.filter((entry) => !entry.isPrimary).length;

  const score = agent.reputation?.score ?? null;
  const feedbackCount = agent.reputation?.feedbackCount ?? 0;
  const clientCount = agent.reputation?.clientCount ?? 0;

  const metadataMissing = agent.profile.metadataResolvedAt === null;
  const declaredActive = agent.profile.traitTags.includes('declared-active');

  /*
   * Whether this agent publishes anything a client could call.
   *
   * The single most useful distinction in the grid, and it was missing: a card for an
   * agent serving a live A2A card looked the same as one for a bare identity with nothing
   * behind it. `protocolTag` alone did not carry it, because it was rendered as the raw
   * enum value and `unconfigured` reads as a data problem rather than as "no endpoint".
   */
  const callable = agent.profile.endpoints.filter(
    (endpoint) => endpoint.kind === 'a2a' || endpoint.kind === 'mcp',
  ).length;
  const interfaceLabel = describeInterface(agent.profile.protocolTag, metadataMissing);

  const traits = TRAIT_PRIORITY.filter((entry) => agent.profile.traitTags.includes(entry.trait));
  const capabilities = agent.profile.capabilities.slice(0, 3);
  const extraCapabilities = agent.profile.capabilities.length - capabilities.length;

  const paidWork = describePaidWork(agent.jobs);
  const endpointHost = reachableAt(agent.profile.endpoints);
  const evidence = evidenceStrength(agent);

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
              {categoryLabel}
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
          {/*
           * Amber when the agent is callable, faint when it is not. This is the one place
           * in the grid where colour is doing real work: it separates an agent you could
           * use from a registry entry you could only look at.
           */}
          <span
            className={callable > 0 ? 'text-3xs text-amber/85' : 'text-3xs text-ink-faint'}
            title={
              callable > 0
                ? `Publishes ${String(callable)} endpoint${callable === 1 ? '' : 's'} a client can call`
                : undefined
            }
          >
            {interfaceLabel}
          </span>
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
          ) : endpointHost ? (
            /*
             * A fact instead of an absence. An agent that declares no capabilities but does
             * publish somewhere to call it is not an empty record, and saying "No capabilities
             * declared" was the least useful true sentence available about it.
             */
            <p className="flex items-baseline gap-1.5 truncate text-2xs text-ink-secondary">
              <span className="text-ink-faint">Reachable at</span>
              <span className="truncate font-mono text-ink-secondary">{endpointHost}</span>
            </p>
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
      {/*
       * An evidence gauge along the card's bottom edge, and the grid's only source of
       * hierarchy.
       *
       * Twenty-four cards of identical weight give the eye nowhere to start, and the obvious
       * fixes are both wrong: making one card larger invents an editorial recommendation the
       * product cannot support, and sorting by score would rank agents by a number most of
       * them do not have. So the differentiation has to come from what each card actually
       * holds.
       *
       * This is that. A hairline that fills in proportion to the evidence behind the agent —
       * escrowed work counts for more than recorded feedback, because a funded job is a
       * budget locked on chain while a score is what a client wrote afterwards. Cards with
       * real history now carry a visibly longer edge, so scanning a page of them surfaces the
       * few worth opening without anything being reordered or resized.
       *
       * Absent evidence draws nothing at all. A zero-width rule is the honest rendering of
       * "no evidence recorded", and it is the same position the score field takes.
       */}
      {evidence > 0 ? (
        <div
          className="relative h-px w-full bg-line"
          role="img"
          aria-label={`Evidence strength: ${String(Math.round(evidence * 100))} of 100`}
        >
          <span
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-dim to-amber transition-[width] duration-500 ease-fjord"
            style={{ width: `${String(Math.round(evidence * 100))}%` }}
            aria-hidden="true"
          />
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
        <div className="min-w-0">
          {/*
           * Escrow leads the evidence footer, above the score, and only when a job was actually
           * funded. It is the strongest thing this grid can say about an agent: a score is what a
           * client wrote afterwards, this is a budget that was locked on chain.
           *
           * Gated on `funded` rather than on any job existing, because creating a job costs
           * nothing and needs no agreement from the agent, so an unfunded one is not a signal.
           *
           * Rare by nature — a few dozen agents in the registry have any — so it does not
           * compete with the score for space in practice. Which is also why it is worth
           * shouting about when it is there.
           */}
          {paidWork ? (
            <p className="flex items-baseline gap-1.5 text-2xs text-amber/90">
              <Coins className="size-3 shrink-0 self-center" aria-hidden="true" />
              <span className="display tabular text-sm text-amber-bright">{paidWork.headline}</span>
              <span className="truncate text-3xs text-amber/70">{paidWork.detail}</span>
            </p>
          ) : null}

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
