'use client';

import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { ErrorState, InlineSpinner, Skeleton } from '../../components/ui/states';
import { ApiError, describeError } from '../../lib/api/errors';
import { agentIdentityUrl, explorerUrl, truncateAddress } from '../../lib/web3/chain';
import { useAgent, useAgentReputation } from '../discovery/use-agents';

/**
 * Agent detail: the screen where a hiring decision gets made.
 *
 * Structured around the questions that decide it — what does this agent do, who
 * controls it, what has it actually done, and why does KATTEGAT put it in this
 * category. The classification signals are shown verbatim rather than summarised
 * into a score, so a user can judge the reasoning instead of trusting it.
 */

const CATEGORY_LABELS: Record<string, string> = {
  rebalancing: 'Rebalancing',
  'grid-trading': 'Grid Trading',
  'yield-optimization': 'Yield Optimization',
  'health-factor-monitoring': 'Health Factor Monitoring',
  uncategorized: 'Uncategorized',
};

export function AgentDetailView({ id }: { id: string }) {
  const { data: agent, isLoading, isError, error, refetch } = useAgent(id);
  // Fetched in parallel; a failure here degrades the reputation panel to the
  // snapshot rather than failing the page.
  const liveQuery = useAgentReputation(id);

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        {...describeError(error)}
        requestId={error instanceof ApiError ? error.requestId : null}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  if (!agent) return null;

  const primary = agent.categories.find((entry) => entry.isPrimary) ?? agent.categories[0];
  const metadataMissing = agent.profile.metadataResolvedAt === null;

  /*
   * Prefer the live registry read, fall back to the snapshot embedded in the agent
   * record while it loads or if it fails. The page renders immediately from cached
   * data and sharpens once the chain answers, rather than blocking on an RPC call.
   */
  const live = liveQuery.data ?? null;
  const snapshot = agent.reputation;
  const feedbackCount = live?.feedbackCount ?? snapshot?.feedbackCount ?? 0;
  const clientCount = live?.clientCount ?? snapshot?.clientCount ?? 0;
  const score = live ? live.score : (snapshot?.score ?? null);
  const rawValue = live ? live.summaryValue : (snapshot?.summaryValue ?? null);
  const rawDecimals = live ? live.summaryDecimals : (snapshot?.summaryDecimals ?? null);

  return (
    <div className="space-y-8">
      <Link
        href="/discover"
        className="inline-flex items-center gap-1.5 text-xs text-content-muted transition-colors hover:text-content-primary"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Back to discover
      </Link>

      {/* -------------------------------- header ------------------------------- */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {primary ? (
            <Badge tone={primary.category === 'uncategorized' ? 'neutral' : 'accent'}>
              {CATEGORY_LABELS[primary.category] ?? primary.category}
            </Badge>
          ) : null}
          <Badge tone="neutral">{agent.profile.protocolTag}</Badge>
          {agent.profile.traitTags.map((trait) => (
            <Badge key={trait} tone="neutral">
              {trait}
            </Badge>
          ))}
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-content-primary sm:text-3xl">
          {agent.profile.name}
        </h1>

        <p className="max-w-3xl text-sm leading-6 text-content-secondary">
          {agent.profile.description ?? 'This agent published no description.'}
        </p>

        {metadataMissing ? (
          // Stated plainly: the identity is verified on chain even though the
          // off-chain document is not readable.
          <p
            role="status"
            className="max-w-3xl rounded-control border border-caution-muted bg-caution-muted/10 px-3 py-2 text-xs text-caution"
          >
            This agent’s off-chain registration file could not be resolved, so its capabilities and
            description are unavailable. Its on-chain identity and ownership are still verified.
          </p>
        ) : null}
      </header>

      {/* ------------------------------- metrics ------------------------------- */}
      <section aria-labelledby="reputation-heading" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="reputation-heading" className="text-sm font-semibold text-content-primary">
            Reputation
          </h2>
          {/* Provenance, not decoration: it changes how much the number is worth. */}
          {live ? (
            <span className="text-2xs text-content-faint">
              {live.origin === 'chain'
                ? 'Read live from the ERC-8004 reputation registry'
                : 'Cached reading — live registry unavailable'}
            </span>
          ) : liveQuery.isLoading ? (
            <InlineSpinner label="Reading registry" />
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric
            label="Score"
            value={score === null ? '—' : score.toFixed(2)}
            hint={
              score === null
                ? 'No feedback recorded'
                : `${String(rawValue)} at ${String(rawDecimals)} dp on chain`
            }
          />
          <Metric label="Reviews" value={String(feedbackCount)} />
          <Metric
            label="Distinct clients"
            value={String(clientCount)}
            hint="Independent addresses that left feedback"
          />
          <Metric
            label="Registered"
            value={
              agent.identity.registeredAt
                ? new Date(agent.identity.registeredAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : '—'
            }
          />
        </div>

        {/* The backend's own notes, shown verbatim rather than reinterpreted. */}
        {live && live.notes.length > 0 ? (
          <ul className="space-y-1">
            {live.notes.map((note) => (
              <li key={note} className="text-xs text-content-faint">
                {note}
              </li>
            ))}
          </ul>
        ) : null}

        {feedbackCount === 0 ? (
          <p className="text-xs text-content-muted">
            No client has recorded feedback for this agent yet. That is not a low score — it is an
            absence of evidence, and it should weigh on a hiring decision accordingly.
          </p>
        ) : null}
      </section>

      {/* ---------------------------- why this agent --------------------------- */}
      <section aria-labelledby="classification-heading" className="space-y-3">
        <h2 id="classification-heading" className="text-sm font-semibold text-content-primary">
          Why this category?
        </h2>

        {agent.categories.map((assignment) => (
          <div
            key={assignment.category}
            className="rounded-card border border-line-subtle bg-surface-raised p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-content-primary">
                {CATEGORY_LABELS[assignment.category] ?? assignment.category}
                {assignment.isPrimary ? (
                  <span className="ml-2 text-2xs text-content-faint">primary</span>
                ) : null}
              </span>
              <span className="text-2xs text-content-muted">
                confidence {(assignment.confidence * 100).toFixed(0)}%
                <span className="ml-2 text-content-faint">
                  ({assignment.classifierVersion})
                </span>
              </span>
            </div>

            <ul className="mt-3 flex flex-wrap gap-1.5">
              {assignment.signals.map((signal) => (
                <li key={signal}>
                  <Badge tone="neutral" className="font-mono">
                    {signal}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* ----------------------------- capabilities ---------------------------- */}
      {agent.profile.capabilities.length > 0 ? (
        <section aria-labelledby="capabilities-heading" className="space-y-3">
          <h2 id="capabilities-heading" className="text-sm font-semibold text-content-primary">
            Declared capabilities
          </h2>
          <ul className="flex flex-wrap gap-1.5">
            {agent.profile.capabilities.map((capability) => (
              <li key={capability}>
                <Badge tone="neutral">{capability}</Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* -------------------------------- onchain ------------------------------ */}
      <section aria-labelledby="onchain-heading" className="space-y-3">
        <h2 id="onchain-heading" className="text-sm font-semibold text-content-primary">
          On-chain identity
        </h2>

        <dl className="divide-y divide-line-subtle overflow-hidden rounded-card border border-line-subtle bg-surface-raised text-xs">
          <Row label="Agent ID">
            <ExternalRef href={agentIdentityUrl(agent.identity.agentId)}>
              #{agent.identity.agentId}
            </ExternalRef>
          </Row>
          <Row label="Owner">
            <ExternalRef href={explorerUrl.address(agent.identity.ownerAddress)}>
              {truncateAddress(agent.identity.ownerAddress, 6)}
            </ExternalRef>
          </Row>
          <Row label="Payment wallet">
            {agent.identity.walletAddress ? (
              <ExternalRef href={explorerUrl.address(agent.identity.walletAddress)}>
                {truncateAddress(agent.identity.walletAddress, 6)}
              </ExternalRef>
            ) : (
              <span className="text-content-faint">Not declared</span>
            )}
          </Row>
          <Row label="Registration file">
            {agent.identity.agentUri ? (
              <span className="font-mono break-all text-content-secondary">
                {agent.identity.agentUri}
              </span>
            ) : (
              <span className="text-content-faint">None set on chain</span>
            )}
          </Row>
        </dl>
      </section>

      {/* Honest about what is not built yet, rather than a dead button. */}
      <section className="rounded-card border border-dashed border-line-strong bg-surface-inset p-5">
        <h2 className="text-sm font-semibold text-content-primary">Hiring</h2>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-content-muted">
          Hiring is not enabled yet. When it is, granting an agent authority will be an explicit,
          scoped step — spend cap, expiry and revocation shown before anything is signed. KATTEGAT
          will never let a listed agent obtain open-ended access to your funds.
        </p>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-card border border-line-subtle bg-surface-raised p-4">
      <dt className="text-2xs tracking-wide text-content-faint uppercase">{label}</dt>
      <dd className="mt-1.5 text-lg font-semibold text-content-primary">{value}</dd>
      {hint ? <p className="mt-1 text-2xs text-content-faint">{hint}</p> : null}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-4 px-4 py-3">
      <dt className="text-content-faint">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function ExternalRef({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 font-mono text-content-secondary transition-colors hover:text-accent"
    >
      {children}
      <ExternalLink className="size-3" aria-hidden="true" />
    </a>
  );
}
