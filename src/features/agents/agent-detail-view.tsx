'use client';

import Link from 'next/link';
import { ArrowLeft, ExternalLink, Layers } from 'lucide-react';
import { AgentImage } from '../../components/ui/agent-image';
import { Badge, StatusDot } from '../../components/ui/badge';
import { Panel, PanelHeader } from '../../components/ui/card';
import { AgentProfileSkeleton, ErrorState } from '../../components/ui/states';
import { ApiError, describeError } from '../../lib/api/errors';
import { CATEGORY_LABELS, describeInterface } from '../../lib/api/contract';
import { agentIdentityUrl } from '../../lib/web3/chain';
import { useAgent, useAgentReputation } from '../discovery/use-agents';
import { AgentInterface } from './agent-interface';
import { AgentReputationPanel } from './agent-reputation-panel';
import { ClassificationEvidence } from './classification-evidence';
import { EscrowPanel } from './escrow-panel';
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
    return (
      <div className="mx-auto max-w-shell px-4 py-12 sm:px-6 lg:px-8">
        <AgentProfileSkeleton />
      </div>
    );
  }

  if (agentQuery.isError) {
    const error = agentQuery.error;
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
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
        <div className="mt-6 text-center">
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

  /*
   * Three states, not two. Read from the profile field rather than the `declared-active`
   * trait tag, because a tag can only be present or absent: an operator declaring
   * `active: false` and an operator saying nothing both lose the tag, and those mean
   * different things to someone deciding whether to call the agent.
   */
  const declaredActive = agent.profile.declaredActive;

  /* The primary way in, if the agent published one. See `agent-interface.tsx`. */
  const primaryEndpoint =
    agent.profile.endpoints.find(
      (endpoint) => endpoint.url !== null && (endpoint.kind === 'a2a' || endpoint.kind === 'mcp'),
    ) ?? agent.profile.endpoints.find((endpoint) => endpoint.url !== null);

  return (
    <div>
      {/* ------------------------------- header ------------------------------- */}
      {/*
       * Full-bleed, with the harbour light behind it. The profile is where an agent
       * stops being a row in an index and becomes a specific thing you are deciding
       * about, so it gets an entrance the grid does not.
       */}
      <section className="relative isolate overflow-hidden border-b border-line">
        <div className="fog pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div
          className="grid-field pointer-events-none absolute inset-0 opacity-20"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-shell px-4 pt-8 pb-12 sm:px-6 lg:px-8 lg:pb-16">
          <Link
            href="/discover"
            className="group inline-flex items-center gap-2 text-2xs tracking-[0.08em] text-ink-muted uppercase transition-colors hover:text-ink"
          >
            <ArrowLeft
              className="size-3.5 transition-transform duration-300 ease-fjord group-hover:-translate-x-1"
              aria-hidden="true"
            />
            All agents
          </Link>

          <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-7">
            <AgentImage
              agentId={agent.identity.id}
              name={agent.profile.name}
              imageUrl={agent.profile.imageUrl}
              size="xl"
              className="shadow-cast"
            />

            <div className="min-w-0 flex-1">
              {/* Category as an eyebrow above the name, the way a title page is set. */}
              <p className="eyebrow text-amber/80">
                {classified ? CATEGORY_LABELS[primary.category] : 'Unclassified'}
              </p>

              {/*
               * The agent's name at display scale. `break-words` because these are
               * machine-generated identifiers that can run long without a space, and a
               * name that overflows its container is worse than one that wraps.
               */}
              <h1 className="display mt-3 text-display-md break-words text-ink">
                {agent.profile.name}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                <StatusDot
                  tone={
                    declaredActive === true
                      ? 'positive'
                      : declaredActive === false
                        ? 'caution'
                        : 'neutral'
                  }
                  label={
                    declaredActive === true
                      ? 'Operator declares active'
                      : declaredActive === false
                        ? 'Operator declares inactive'
                        : 'Status not declared'
                  }
                />
                <span className="text-line-strong" aria-hidden="true">
                  /
                </span>
                {/*
                 * The same phrasing the grid uses. This badge printed the raw enum, so an
                 * agent read "A2A endpoint" on its card and `a2a` on its own page.
                 */}
                <Badge tone={primaryEndpoint ? 'amber' : 'neutral'}>
                  {describeInterface(agent.profile.protocolTag, metadataMissing)}
                </Badge>
                <span className="text-line-strong" aria-hidden="true">
                  /
                </span>
                <span className="font-mono text-2xs text-ink-faint">#{agent.identity.agentId}</span>
              </div>

              {/*
               * `whitespace-pre-line` because 655 agents write their description across
               * several lines, and HTML collapses those into one run. Only here, not on the
               * card, where the text is clamped to two lines and a line break would spend
               * one of them on nothing.
               */}
              <p className="mt-6 max-w-reading text-sm leading-7 whitespace-pre-line text-ink-secondary">
                {agent.profile.description ?? 'This agent published no description.'}
              </p>

              {metadataMissing ? (
                <p
                  role="status"
                  className="mt-5 max-w-reading rounded-control border border-caution/30 bg-caution-wash/15 px-3.5 py-2.5 text-xs leading-6 text-caution"
                >
                  This agent’s off-chain registration file could not be resolved, so its
                  capabilities and description are unavailable. Its on-chain identity and ownership
                  are still verified.
                </p>
              ) : null}

              <div className="mt-7 flex flex-wrap items-center gap-3">
                {/*
                 * The agent's own endpoint gets the lead position when it has one, because
                 * it is the only link on the page that goes to the agent rather than to a
                 * record of the agent. `Inspect on-chain` stays, demoted: verification
                 * matters, but it is the second question.
                 */}
                {primaryEndpoint?.url ? (
                  <a
                    href={primaryEndpoint.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group inline-flex h-10 items-center gap-2 rounded-control border border-amber-dim/30 bg-amber-wash/25 px-4 text-xs font-medium text-amber transition-colors duration-200 hover:bg-amber-wash/40"
                  >
                    Open {primaryEndpoint.kind === 'a2a' ? 'agent card' : 'endpoint'}
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                ) : null}

                <a
                  href={agentIdentityUrl(agent.identity.agentId)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group inline-flex h-10 items-center gap-2 rounded-control border border-line-strong bg-surface-overlay/70 px-4 text-xs font-medium text-ink transition-colors duration-200 hover:bg-surface-hover"
                >
                  Inspect on-chain
                  <ExternalLink
                    className="size-3 text-ink-faint transition-colors group-hover:text-amber"
                    aria-hidden="true"
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------- body -------------------------------- */}
      {/*
       * No scroll reveals below this point, deliberately. Everything here is evidence
       * feeding a decision about money, and staging it behind an entrance animation
       * would delay exactly the content the page exists to show. Motion earns its place
       * on the landing page, where the user is reading; not here, where they are
       * checking.
       */}
      <div className="mx-auto max-w-shell px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
          <div className="min-w-0 space-y-4">
            {/*
             * Interface leads the body, above reputation.
             *
             * Reputation answers "should I use this", which is only worth asking once
             * "can I use this at all" has an answer. With the endpoints buried, every
             * profile read as the same page with different words in it, because the one
             * thing that varies between a working agent and an empty registration was
             * the one thing not shown.
             */}
            <AgentInterface
              endpoints={agent.profile.endpoints}
              trustModels={agent.profile.trustModels}
              x402Support={agent.profile.x402Support}
              metadataResolved={!metadataMissing}
            />

            {/*
             * Escrow above reputation, deliberately.
             *
             * Both answer "should I trust this", but a job is a budget that was locked on chain
             * and released, while a reputation score is what a client said afterwards. When the
             * two disagree, the payment is the better evidence, so it reads first.
             */}
            <EscrowPanel agent={agent} />

            <AgentReputationPanel
              agent={agent}
              live={reputationQuery.data ?? null}
              isLoading={reputationQuery.isLoading}
            />

            <ClassificationEvidence categories={agent.categories} />

            <CapabilityPanel
              capabilities={agent.profile.capabilities}
              traits={agent.profile.traitTags}
            />

            <OnChainIdentity agent={agent} />
          </div>

          {/* Hiring is the page's destination, so it stays visible while scrolling. */}
          <div className="lg:sticky lg:top-20">
            <HiringPanel agentId={agent.identity.id} agentName={agent.profile.name} />
          </div>
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
function CapabilityPanel({ capabilities, traits }: { capabilities: string[]; traits: string[] }) {
  if (capabilities.length === 0 && traits.length === 0) return null;

  return (
    <Panel>
      <PanelHeader
        title="Capabilities"
        hint="Self-declared in the agent’s registration file. KATTEGAT has not verified that they function."
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
