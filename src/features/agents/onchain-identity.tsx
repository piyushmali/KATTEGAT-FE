'use client';

import { useState } from 'react';
import { ChevronDown, ExternalLink, FileJson } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { CopyButton } from '../../components/ui/copy-button';
import { DataRow, Panel, PanelHeader, type PanelWeight } from '../../components/ui/card';
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
export function OnChainIdentity({
  agent,
  weight = 'default',
}: {
  agent: Agent;
  weight?: PanelWeight;
}) {
  const quiet = weight === 'quiet';
  const [sourceOpen, setSourceOpen] = useState(false);
  const { identity, profile } = agent;

  const registered = formatDate(identity.registeredAt);

  /*
   * Shared by both branches of the Registered row. Extracted rather than repeated because the
   * block is now known for far more agents than the date is — the log sweep records it, the
   * timestamp would cost an extra call per agent — so "no date" and "no block" stopped being
   * the same condition, and the block has to appear in the no-date branch too.
   */
  const block =
    identity.registeredAtBlock === null ? null : (
      <a
        href={explorerUrl.block(identity.registeredAtBlock)}
        target="_blank"
        rel="noreferrer noopener"
        className="ml-1.5 font-mono text-3xs text-ink-faint transition-colors hover:text-amber"
      >
        block {formatCount(identity.registeredAtBlock)}
      </a>
    );

  return (
    <Panel weight={weight}>
      <PanelHeader
        level={3}
        bare={quiet}
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
        <DataRow bare={quiet} label="Agent ID">
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-ink">#{identity.agentId}</span>
            <CopyButton value={String(identity.agentId)} label="agent ID" />
          </span>
        </DataRow>

        <DataRow bare={quiet} label="Owner">
          <AddressValue address={identity.ownerAddress} label="owner address" />
        </DataRow>

        <DataRow bare={quiet} label="Payment wallet">
          {identity.walletAddress ? (
            <AddressValue address={identity.walletAddress} label="payment wallet" />
          ) : (
            <span className="text-ink-faint">Not declared</span>
          )}
        </DataRow>

        <DataRow bare={quiet} label="Standard">
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <Badge tone="amber">ERC-8004</Badge>
            <Badge tone="outline" mono>
              {profile.protocolTag}
            </Badge>
          </span>
        </DataRow>

        <DataRow bare={quiet} label="Registered">
          {registered ? (
            <span className="text-ink-secondary">
              {registered}
              {block}
            </span>
          ) : (
            /*
             * The date is still a real gap for most of the catalogue. Filling it needs a
             * timestamp per registration block, which is one RPC call per agent — a cost the
             * block number and the transaction hash do not carry, since both arrive with the
             * log itself.
             *
             * So this says what is known instead of stopping at "Not recorded". The block is
             * shown whenever the sweep has found it, and the explorer resolves it to a
             * timestamp in one click. Ids are minted sequentially, so the id alone already
             * places the agent in registration order, which is what the marketplace sorts by.
             */
            <span className="text-ink-faint">
              Date not indexed
              {identity.registeredAtBlock === null ? (
                <span className="ml-1.5 text-3xs">
                  registration #{formatCount(identity.agentId)} in sequence
                </span>
              ) : (
                block
              )}
            </span>
          )}
        </DataRow>

        <DataRow bare={quiet} label="Registration tx">
          {identity.registrationTxHash ? (
            <span className="inline-flex items-center gap-1.5">
              <a
                href={explorerUrl.tx(identity.registrationTxHash)}
                target="_blank"
                rel="noreferrer noopener"
                title={identity.registrationTxHash}
                className="font-mono text-ink-secondary transition-colors hover:text-amber"
              >
                {truncateAddress(identity.registrationTxHash, 8)}
              </a>
              <CopyButton value={identity.registrationTxHash} label="registration transaction" />
            </span>
          ) : (
            /*
             * Absence means "not harvested yet", never "not registered". The hash comes from
             * a sweep over the registry's `Registered` logs that runs separately from
             * ingestion, so a newly indexed agent is real and complete in every other respect
             * while this is still pending. Saying so is the difference between a gap a visitor
             * can reason about and one that reads as a broken listing.
             */
            <span className="text-ink-faint">
              Not indexed yet
              <span className="ml-1.5 text-3xs">verify via the registry link above</span>
            </span>
          )}
        </DataRow>

        <DataRow bare={quiet} label="Registration file">
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
