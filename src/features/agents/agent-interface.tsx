import { Coins, ExternalLink, Globe, MessagesSquare, Plug, Terminal, Wallet } from 'lucide-react';
import type { ComponentType } from 'react';
import { Badge } from '../../components/ui/badge';
import { CopyButton } from '../../components/ui/copy-button';
import { Panel, PanelHeader } from '../../components/ui/card';
import type { AgentEndpoint, EndpointKind } from '../../lib/api/contract';

/**
 * How to actually reach the agent.
 *
 * This panel exists because without it a profile is a name, a category and two block
 * explorer links, which cannot answer the first question anyone has: does this thing do
 * anything, and how would I call it. The endpoints here are the operator's own answer,
 * published in the registration file the registry points at.
 *
 * Nothing on this panel is checked by KATTEGAT. An endpoint being listed means the
 * operator wrote it on chain, not that a request to it succeeds, and the copy says so
 * once rather than hedging on every row. Probing 317,000 endpoints to claim otherwise
 * would be a different product, and claiming it without probing would be a lie.
 */

const KIND_META: Record<
  EndpointKind,
  { icon: ComponentType<{ className?: string }>; label: string; detail: string }
> = {
  a2a: {
    icon: Plug,
    label: 'A2A',
    detail: 'Agent-to-agent card. The standard way another agent negotiates work with this one.',
  },
  mcp: {
    icon: Terminal,
    label: 'MCP',
    detail: 'Model Context Protocol server. Exposes this agent as a tool to an LLM client.',
  },
  web: {
    icon: Globe,
    label: 'Web',
    detail: 'A human-facing page or HTTP API.',
  },
  wallet: {
    icon: Wallet,
    label: 'Wallet',
    detail: 'An address or wallet service the agent transacts through.',
  },
  social: {
    icon: MessagesSquare,
    label: 'Social',
    detail: 'A messaging or social account the operator publishes for contact.',
  },
  other: {
    icon: Coins,
    label: 'Other',
    detail: 'A reference in a scheme KATTEGAT does not interpret, shown exactly as published.',
  },
};

/**
 * Machine interfaces first, contact details last.
 *
 * An A2A card is how the agent is used; a Telegram handle is how you complain to its
 * operator. Both belong on the page, and putting them in publication order would bury
 * the first behind the second.
 */
const KIND_ORDER: EndpointKind[] = ['a2a', 'mcp', 'web', 'wallet', 'other', 'social'];

export function AgentInterface({
  endpoints,
  trustModels,
  x402Support,
  metadataResolved,
}: {
  endpoints: AgentEndpoint[];
  trustModels: string[];
  x402Support: boolean | null;
  metadataResolved: boolean;
}) {
  const sorted = [...endpoints].sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind),
  );

  const machineReadable = sorted.filter(
    (endpoint) => endpoint.kind === 'a2a' || endpoint.kind === 'mcp',
  ).length;

  return (
    <Panel>
      <PanelHeader
        title="Interface"
        hint="Endpoints the operator published in this agent's registration file. KATTEGAT lists them as found and does not call them."
        action={
          machineReadable > 0 ? (
            <Badge tone="positive">
              {machineReadable === 1
                ? '1 callable interface'
                : `${machineReadable} callable interfaces`}
            </Badge>
          ) : null
        }
      />

      {sorted.length > 0 ? (
        <ul className="divide-y divide-line">
          {sorted.map((endpoint, index) => (
            <EndpointRow
              key={`${endpoint.kind}-${String(index)}-${endpoint.value}`}
              endpoint={endpoint}
            />
          ))}
        </ul>
      ) : (
        <EmptyInterface metadataResolved={metadataResolved} />
      )}

      {trustModels.length > 0 || x402Support !== null ? (
        <div className="border-t border-line px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {trustModels.length > 0 ? (
              <div className="min-w-0">
                <p className="eyebrow">Trust models declared</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {trustModels.map((model) => (
                    <li key={model}>
                      {/*
                       * Passed through in the operator's own wording, including values
                       * outside the spec. Normalising `termix-platform` into something
                       * tidier would misreport what 256 agents actually declared.
                       */}
                      <Badge tone={model === 'tee-attestation' ? 'info' : 'outline'} mono>
                        {model}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {x402Support !== null ? (
              <div>
                <p className="eyebrow">Pay per call</p>
                <p className="mt-2 text-xs text-ink-secondary">
                  {x402Support ? (
                    <Badge tone="amber">
                      <Coins className="size-2.5" aria-hidden="true" />
                      x402 accepted
                    </Badge>
                  ) : (
                    <span className="text-ink-faint">Not offered</span>
                  )}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */

function EndpointRow({ endpoint }: { endpoint: AgentEndpoint }) {
  const meta = KIND_META[endpoint.kind];
  const Icon = meta.icon;

  return (
    <li className="px-4 py-3.5 sm:px-5">
      <div className="flex items-baseline gap-2">
        <Icon className="size-3.5 shrink-0 translate-y-0.5 text-ink-faint" aria-hidden="true" />
        <span className="eyebrow">{meta.label}</span>

        {/*
         * The operator's own label, shown only when it adds something. Half the registry
         * names its A2A endpoint "A2A", and repeating the kind badge next to itself is
         * noise.
         */}
        {endpoint.label && endpoint.label.toLowerCase() !== meta.label.toLowerCase() ? (
          <span className="min-w-0 truncate text-2xs text-ink-muted">{endpoint.label}</span>
        ) : null}

        {endpoint.version ? (
          <span className="ml-auto shrink-0 font-mono text-3xs text-ink-faint">
            v{endpoint.version}
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex items-start gap-1.5 pl-[1.375rem]">
        {/*
         * The published value is always rendered, linked only when the backend judged it
         * a safe `https:` target. A CAIP-10 contract reference and an `mcp://` URL are
         * both real endpoints that cannot be an `href`, and showing a blank where one
         * should be would hide what is genuinely on chain.
         */}
        {endpoint.url ? (
          <a
            href={endpoint.url}
            target="_blank"
            rel="noreferrer noopener"
            className="group min-w-0 flex-1 font-mono text-3xs break-all text-ink-secondary transition-colors hover:text-amber"
          >
            {endpoint.value}
            <ExternalLink
              className="ml-1 inline size-2.5 shrink-0 align-baseline text-ink-faint transition-colors group-hover:text-amber"
              aria-hidden="true"
            />
          </a>
        ) : (
          <code className="min-w-0 flex-1 font-mono text-3xs break-all text-ink-secondary">
            {endpoint.value}
          </code>
        )}

        <CopyButton value={endpoint.value} label={`${meta.label} endpoint`} />
      </div>

      <p className="mt-1.5 pl-[1.375rem] text-3xs leading-5 text-ink-faint">{meta.detail}</p>
    </li>
  );
}

/**
 * No endpoints.
 *
 * Two different situations, and collapsing them would misinform. An agent with resolved
 * metadata and no services has genuinely published nothing to call, which is a fact about
 * the agent. An agent whose metadata never resolved might publish plenty; KATTEGAT simply
 * does not have the document, which is a fact about KATTEGAT.
 */
function EmptyInterface({ metadataResolved }: { metadataResolved: boolean }) {
  return (
    <div className="px-4 py-5 sm:px-5">
      {metadataResolved ? (
        <>
          <p className="text-xs leading-6 text-ink-secondary">
            This agent declared no service endpoints.
          </p>
          <p className="mt-1.5 text-3xs leading-5 text-ink-faint">
            Its identity and ownership are registered on chain, but it publishes no interface for a
            client to call. Registering an identity and running a service are separate steps, and
            many entries have only taken the first.
          </p>
        </>
      ) : (
        <>
          <p className="text-xs leading-6 text-ink-secondary">Endpoints are not known yet.</p>
          <p className="mt-1.5 text-3xs leading-5 text-ink-faint">
            The registration file this agent points at has not resolved, so KATTEGAT cannot say what
            it exposes. This is a gap in our index, not a statement about the agent.
          </p>
        </>
      )}
    </div>
  );
}
