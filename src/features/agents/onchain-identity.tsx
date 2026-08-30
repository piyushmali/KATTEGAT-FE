'use client';

import { useState } from 'react';
import { ChevronDown, ExternalLink, FileJson } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { CopyButton } from '../../components/ui/copy-button';
import { DataRow, Panel, PanelHeader } from '../../components/ui/card';
import { cn } from '../../lib/utils/cn';
import { formatCount, formatDate } from '../../lib/utils/format';
import { agentIdentityUrl, explorerUrl, truncateAddress } from '../../lib/web3/chain';
import type { Agent } from '../../lib/api/contract';

/**
 * On-chain identity and registration provenance.
 *
 * The facts here are what make everything else on the page checkable, so each one is
 * copyable and linked to the block explorer. Addresses are truncated with the full
 * value on hover and in the clipboard — a full 42-character hash in a layout is noise
 * that pushes the useful content off screen.
 *
 * The registration file is treated as evidence rather than a URL to display: a
 * 200-character S3 link across the page is the difference between reading as a product
 * and reading as a debug dump, so the raw source sits behind a disclosure.
 */
export function OnChainIdentity({ agent }: { agent: Agent }) {
  const [sourceOpen, setSourceOpen] = useState(false);
  const { identity, profile } = agent;

  const registered = formatDate(identity.registeredAt);

  return (
    <Panel>
      <PanelHeader
        title="On-chain identity"
        action={
          <a
            href={agentIdentityUrl(identity.agentId)}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-2xs text-ink-muted transition-colors hover:text-amber"
          >
            View on BscScan
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        }
      />

      <dl className="divide-y divide-line">
        <DataRow label="Agent ID">
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-ink">#{identity.agentId}</span>
            <CopyButton value={String(identity.agentId)} label="agent ID" />
          </span>
        </DataRow>

        <DataRow label="Owner">
          <AddressValue address={identity.ownerAddress} label="owner address" />
        </DataRow>

        <DataRow label="Payment wallet">
          {identity.walletAddress ? (
            <AddressValue address={identity.walletAddress} label="payment wallet" />
          ) : (
            <span className="text-ink-faint">Not declared</span>
          )}
        </DataRow>

        <DataRow label="Standard">
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <Badge tone="amber">ERC-8004</Badge>
            <Badge tone="outline" mono>
              {profile.protocolTag}
            </Badge>
          </span>
        </DataRow>

        <DataRow label="Registered">
          {registered ? (
            <span className="text-ink-secondary">
              {registered}
              {identity.registeredAtBlock ? (
                <span className="ml-1.5 font-mono text-3xs text-ink-faint">
                  block {formatCount(identity.registeredAtBlock)}
                </span>
              ) : null}
            </span>
          ) : (
            /*
             * A real gap, and the common case: 317,010 of 317,476 agents have no block
             * timestamp, because the ID-walk backfill does not read the `Registered` event
             * and free RPC tiers will not serve enough log history to fill it in.
             *
             * Says what is still known rather than stopping at "Not recorded". Ids are
             * minted sequentially, so the id alone places the agent in registration order,
             * which is what the marketplace sorts by.
             */
            <span className="text-ink-faint">
              Date not indexed
              <span className="ml-1.5 text-3xs">
                registration #{formatCount(identity.agentId)} in sequence
              </span>
            </span>
          )}
        </DataRow>

        <DataRow label="Registration file">
          {identity.agentUri ? (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={profile.metadataResolvedAt ? 'positive' : 'caution'}>
                  <FileJson className="size-3" aria-hidden="true" />
                  {profile.metadataResolvedAt ? 'Resolved' : 'Unresolved'}
                </Badge>
                <button
                  type="button"
                  onClick={() => {
                    setSourceOpen((open) => !open);
                  }}
                  aria-expanded={sourceOpen}
                  className="inline-flex items-center gap-1 text-2xs text-ink-muted transition-colors hover:text-ink"
                >
                  {sourceOpen ? 'Hide source' : 'View source'}
                  <ChevronDown
                    className={cn('size-3 transition-transform', sourceOpen && 'rotate-180')}
                    aria-hidden="true"
                  />
                </button>
              </div>

              {sourceOpen ? (
                <div className="animate-rise mt-2 rounded-card border border-line bg-surface-inset p-2.5">
                  <p className="mb-1.5 text-3xs text-ink-faint">agentURI</p>
                  <div className="flex items-start gap-1.5">
                    <code className="min-w-0 flex-1 font-mono text-3xs break-all text-ink-secondary">
                      {identity.agentUri}
                    </code>
                    <CopyButton value={identity.agentUri} label="registration file URI" />
                  </div>
                  {identity.agentUri.startsWith('http') ? (
                    <a
                      href={identity.agentUri}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-2 inline-flex items-center gap-1 text-2xs text-ink-muted transition-colors hover:text-amber"
                    >
                      Open registration file
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <span className="text-ink-faint">None set on chain</span>
          )}
        </DataRow>
      </dl>
    </Panel>
  );
}

/** Truncated, copyable, explorer-linked address. */
function AddressValue({ address, label }: { address: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <a
        href={explorerUrl.address(address)}
        target="_blank"
        rel="noreferrer noopener"
        title={address}
        className="font-mono text-ink-secondary transition-colors hover:text-amber"
      >
        {truncateAddress(address, 6)}
      </a>
      <CopyButton value={address} label={label} />
    </span>
  );
}
