'use client';

import Link from 'next/link';
import { ArrowLeft, ExternalLink, Layers } from 'lucide-react';
import { AgentAvatar } from '../../components/ui/agent-avatar';
import { Badge, StatusDot } from '../../components/ui/badge';
import { Panel, PanelHeader } from '../../components/ui/card';
import { AgentProfileSkeleton, ErrorState } from '../../components/ui/states';
import { ApiError, describeError } from '../../lib/api/errors';
import { CATEGORY_LABELS } from '../../lib/api/contract';
import { agentIdentityUrl } from '../../lib/web3/chain';
import { useAgent, useAgentReputation } from '../discovery/use-agents';
import { AgentReputationPanel } from './agent-reputation-panel';
import { ClassificationEvidence } from './classification-evidence';
import { HiringPanel } from './hiring-panel';
import { OnChainIdentity } from './onchain-identity';

/**
 * Agent profile — where the hiring decision gets made.
 *
 * Ordered by the questions a user asks, not by what is technically convenient:
 * what is this → can I trust it → why is it in this category → what does it claim it
 * can do → is its identity real → what would hiring actually grant.
 *
 * Reputation and classification lead because they are the decision; the on-chain
 * identity table is verification and sits lower. That ordering is the difference
 * between an agent profile and a block explorer page.
 */
export function AgentDetailView({ id }: { id: string }) {
  const agentQuery = useAgent(id);
  // Fetched in parallel. A failure here degrades the reputation panel to the cached
  // snapshot rather than failing the page.
  const reputationQuery = useAgentReputation(id);

  if (agentQuery.isLoading) {
    return <AgentProfileSkeleton />;
  }

  if (agentQuery.isError) {
    const error = agentQuery.error;
    return (
      <div className="mx-auto max-w-2xl">
        <ErrorState
          {...describeError(error)}
          upstream={
            error instanceof ApiError &&
            (error.code === 'UPSTREAM_UNAVAILABLE' || error.code === 'NETWORK_ERROR')
          }
          requestId={error instanceof ApiError ? error.requestId : null}
          onRetry={() => {
            void agentQuery.refetch();
          }}
        />
        <div className="mt-4 text-center">
          <Link
            href="/discover"
            className="text-xs text-ink-muted transition-colors hover:text-ink"
          >
            Back to discover
          </Link>
        </div>
      </div>
    );
  }

  const agent = agentQuery.data;
  if (!agent) return null;

  const primary = agent.categories.find((entry) => entry.isPrimary) ?? agent.categories[0];
  const classified = primary !== undefined && primary.category !== 'uncategorized';
  const metadataMissing = agent.profile.metadataResolvedAt === null;
  const declaredActive = agent.profile.traitTags.includes('declared-active');

  return (
    <div className="space-y-6">
      <Link
        href="/discover"
        className="inline-flex items-center gap-1.5 text-xs text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        All agents
      </Link>

      {/* ------------------------------- header ------------------------------- */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <AgentAvatar
          agentId={agent.identity.id}
          name={agent.profile.name}
          size="xl"
          className="sm:size-20"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {classified ? (
              <Badge tone="amber">{CATEGORY_LABELS[primary.category]}</Badge>
            ) : (
              <Badge tone="outline">Unclassified</Badge>
            )}
            <Badge tone="neutral" mono>
              {agent.profile.protocolTag}
            </Badge>
            <StatusDot
              tone={declaredActive ? 'positive' : 'neutral'}
              label={declaredActive ? 'Declared active' : 'Status not declared'}
            />
          </div>

          <h1 className="mt-2.5 text-xl leading-tight font-semibold tracking-tight text-ink sm:text-2xl">
            {agent.profile.name}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-secondary">
            {agent.profile.description ?? 'This agent published no description.'}
          </p>

          {metadataMissing ? (
            <p
              role="status"
              className="mt-3 max-w-3xl rounded-control border border-caution/30 bg-caution-wash/15 px-3 py-2 text-xs leading-5 text-caution"
            >
              This agent’s off-chain registration file could not be resolved, so its capabilities
              and description are unavailable. Its on-chain identity and ownership are still
              verified.
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a
              href={agentIdentityUrl(agent.identity.agentId)}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface-raised px-2.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-overlay hover:text-ink"
            >
              Inspect on-chain
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </div>
        </div>
      </header>

      {/* -------------------------------- body -------------------------------- */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div className="min-w-0 space-y-3">
          <AgentReputationPanel
            agent={agent}
            live={reputationQuery.data ?? null}
            isLoading={reputationQuery.isLoading}
          />

          <ClassificationEvidence categories={agent.categories} />

          <CapabilityPanel capabilities={agent.profile.capabilities} traits={agent.profile.traitTags} />

          <OnChainIdentity agent={agent} />
        </div>

        {/* Hiring is the page's destination, so it stays visible while scrolling. */}
        <div className="lg:sticky lg:top-20">
          <HiringPanel agentName={agent.profile.name} />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Declared capabilities.
 *
 * "Declared" is load-bearing in the copy: these come from the agent's own
 * registration file. KATTEGAT has not verified that any of them work, and saying so
 * is more useful than implying a guarantee we cannot make.
 */
function CapabilityPanel({
  capabilities,
  traits,
}: {
  capabilities: string[];
  traits: string[];
}) {
  if (capabilities.length === 0 && traits.length === 0) return null;

  return (
    <Panel>
      <PanelHeader
        title="Capabilities"
        hint="Self-declared in the agent’s registration file — KATTEGAT has not verified that they function."
      />
      <div className="space-y-4 p-4 sm:p-5">
        {capabilities.length > 0 ? (
          <div>
            <p className="eyebrow">Declared skills</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {capabilities.map((capability) => (
                <li key={capability}>
                  <Badge tone="neutral" mono>
                    {capability}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-ink-faint">No capabilities declared.</p>
        )}

        {traits.length > 0 ? (
          <div className="border-t border-line pt-4">
            <p className="eyebrow">Registry traits</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {traits.map((trait) => (
                <li key={trait}>
                  <Badge tone={trait === 'tee-attested' ? 'info' : 'outline'}>
                    <Layers className="size-2.5" aria-hidden="true" />
                    {trait}
                  </Badge>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-3xs text-ink-faint">
              Derived from the registration file by the ERC-8004 indexer.
            </p>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
