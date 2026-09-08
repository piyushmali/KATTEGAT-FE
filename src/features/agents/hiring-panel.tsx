'use client';

import { useState } from 'react';
import { Clock, Coins, ExternalLink, Lock, RotateCcw, ShieldCheck } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Panel, PanelHeader, type PanelWeight } from '../../components/ui/card';
import { InlineSpinner, Skeleton } from '../../components/ui/states';
import { describeWeb3Error } from '../../lib/api/errors';
import { formatDate } from '../../lib/utils/format';
import { sessionTargetsFor, truncateAddress } from '../../lib/web3/chain';
import type { AgentSession, SpendPeriod } from '../../lib/api/contract';
import { supportsPasskeys } from '../../lib/web3/agent-authority';
import { CommissionForm } from './commission-form';
import { useAgentSessions, useHireAgent, useRevokeAgent } from './use-hiring';

/**
 * Hiring: granting an agent scoped authority, and taking it back.
 *
 * The safety principle, which the whole panel exists to make true rather than to claim:
 * KATTEGAT never offers to give an agent access to a wallet. It offers to grant explicitly
 * scoped authority, and every bound is enforced by the Altana account contract on BNB Chain,
 * not by this app. A call outside the allowlist reverts at validation time whether or not
 * KATTEGAT is still running.
 *
 * WHY THE REVOKE BUTTON IS THE IMPORTANT ONE
 *
 * A marketplace that can grant authority and cannot withdraw it has shipped the dangerous
 * half of the feature. Revocation is one transaction and takes effect immediately, and it is
 * given the same prominence as the grant rather than filed under settings.
 *
 * WHERE THE AUTHORITY LIVES
 *
 * In the user's device, as a passkey in its secure hardware. Both the grant and the revocation
 * are signed here in the browser behind a biometric prompt, and KATTEGAT's backend holds no key
 * that could do either. It verifies the result against the public Altana Keystore and keeps an
 * index; if our servers were compromised, nobody's agent authority would change.
 *
 * An earlier version of this panel had the backend sign on the user's behalf and called it a
 * sandbox. That was custodial with a disclaimer, and it also made wallet connect pointless.
 * Worth recording, because "we hold the key but only on testnet" is an easy thing to talk
 * yourself into.
 *
 * NOTHING HERE HARDCODES A CHAIN
 *
 * Network name, native token symbol, explorer host and whether gas is sponsored all arrive from
 * the API. Going live is a backend environment change and this panel follows it, including the
 * copy that warns about real funds.
 */

const PRESET_CAPS = [
  { label: '0.001', wei: '1000000000000000' },
  { label: '0.01', wei: '10000000000000000' },
  { label: '0.1', wei: '100000000000000000' },
] as const;

const PRESET_DURATIONS = [
  { label: '1 hour', minutes: 60 },
  { label: '24 hours', minutes: 1_440 },
  { label: '7 days', minutes: 10_080 },
] as const;

const SPEND_PERIOD: SpendPeriod = 'day';

export function HiringPanel({
  agentId,
  agentName,
  providerAddress,
  weight = 'default',
}: {
  agentId: string;
  agentName: string;
  weight?: PanelWeight;
  /**
   * The agent's own wallet address, which is how the escrow kernel names it as a provider.
   *
   * Null when the agent published none. Granting authority still works in that case, because a
   * session is about the user's own wallet; commissioning work does not, because there is no
   * address to pay.
   */
  providerAddress: string | null;
}) {
  const sessionsQuery = useAgentSessions(agentId);
  const hire = useHireAgent(agentId);
  const revoke = useRevokeAgent(agentId);

  const [capWei, setCapWei] = useState<string>(PRESET_CAPS[1].wei);
  const [durationMinutes, setDurationMinutes] = useState<number>(PRESET_DURATIONS[0].minutes);
  /*
   * Null until the user picks, rather than seeded with an address. Which contracts exist
   * depends on the network, and the network arrives with the sessions query — so a seeded
   * default would have to be a hex literal chosen before we know which chain we are on, which
   * is the bug this replaces. Null means "the network's first target", resolved below.
   */
  const [selectedTargets, setSelectedTargets] = useState<string[] | null>(null);

  const data = sessionsQuery.data;
  const context = data?.context;
  const sessions = data?.sessions ?? [];
  const live = sessions.filter((session) => session.status === 'active');
  const past = sessions.filter((session) => session.status !== 'active');

  const presetTargets = sessionTargetsFor(context?.network ?? '');

  /*
   * Filtered against the current network's targets, so a selection cannot survive into a grant
   * on a chain where that address is not what the label says. The network is backend
   * configuration and does not change under a live page, but the failure mode if it ever did
   * is a session authorising the wrong contract, which is the one outcome worth this line.
   */
  const offered = new Set<string>(presetTargets.map((preset) => preset.address));
  const targets = (
    selectedTargets ?? presetTargets.slice(0, 1).map((preset) => preset.address)
  ).filter((address) => offered.has(address));

  const toggleTarget = (address: string): void => {
    setSelectedTargets(
      targets.includes(address)
        ? targets.filter((entry) => entry !== address)
        : [...targets, address],
    );
  };

  return (
    <Panel weight={weight}>
      <PanelHeader
        title="Hiring"
        action={
          /*
           * From the API, not a literal. This read "BNB testnet" unconditionally, so a mainnet
           * deployment would have labelled real funds as a test network — against this file's
           * own rule that nothing here hardcodes a chain.
           */
          context?.enabled ? (
            <Badge tone={context.isMainnet ? 'caution' : 'positive'}>{context.network}</Badge>
          ) : (
            <Badge tone="outline">Unavailable</Badge>
          )
        }
      />

      <div className="p-4 sm:p-5">
        {/*
         * The one sentence a user must not skim, because it is the difference between scoped
         * authority and handing over a wallet.
         *
         * The shield rides the line rather than sitting in a 40px bordered badge above it. That
         * badge was the same centred-icon-in-a-box device the empty and error states used to
         * lean on, and once those were rebuilt it was the last one left in the product — a
         * decoration announcing a sentence that is perfectly capable of announcing itself.
         */}
        <p className="display flex items-start gap-2.5 text-lg leading-snug text-ink">
          <ShieldCheck
            className="mt-1 size-4 shrink-0 text-amber"
            aria-hidden="true"
          />
          <span>
            Scoped authority, <em>not</em> wallet access
          </span>
        </p>

        {sessionsQuery.isLoading ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        ) : context?.enabled && !supportsPasskeys() ? (
          /*
           * Checked before offering the form rather than at the biometric prompt, which is the
           * point where the user has already decided to hire. WebAuthn needs a secure context
           * and a platform authenticator, so http:// and some embedded browsers cannot hold
           * authority at all.
           */
          <p className="mt-2.5 text-xs leading-6 text-ink-muted">
            This browser cannot hold agent authority. Hiring needs a passkey, which requires a
            secure (https) connection and a device authenticator such as Face ID, Touch ID or
            Windows Hello.
          </p>
        ) : !context?.enabled ? (
          /*
           * No signer configured, or mock mode. Says so plainly rather than showing a form
           * that cannot work: a disabled control with no explanation reads as a broken page.
           */
          <p className="mt-2.5 text-xs leading-6 text-ink-muted">
            This deployment has no session signer configured, so hiring is switched off. The
            agent&rsquo;s identity, endpoints and reputation above are unaffected.
          </p>
        ) : (
          <>
            <p className="mt-2.5 text-xs leading-6 text-ink-muted">
              Grant {agentName} a session bounded by the three limits below. They are enforced
              by the Altana account contract on chain, so they hold even if KATTEGAT stops
              running, and you can revoke in one transaction at any time.
            </p>

            {/*
             * The custody statement, and the most important sentence here.
             *
             * An earlier version of this panel said the opposite: the backend held an admin key
             * and signed on the user's behalf, and this notice called it a sandbox. That was
             * describing the problem rather than fixing it. Authority now lives in the user's
             * device and our servers cannot grant or revoke anything, which is worth stating
             * plainly because it is the difference between this product and most of its
             * competitors.
             */}
            {/*
             * Marked with a metal edge rather than wrapped in another box. This panel already
             * sits inside a bordered surface, and stacking two or three inset cards inside it
             * turned the most important paragraph on the page into one card among several. A
             * left rule gives it weight without adding a frame, and it is the same device the
             * error state uses, so "read this" looks the same wherever it appears.
             */}
            <p className="mt-4 border-l-2 border-amber-dim/60 pl-3.5 text-2xs leading-5 text-ink-muted">
              Your authority stays in this device. Hiring creates a passkey held in your
              hardware, and every grant and revocation is signed there behind Face ID, Touch ID
              or Windows Hello. KATTEGAT&rsquo;s servers never hold it and cannot grant or
              revoke on your behalf.
              {context.gasSponsored ? ' We cover the gas for your first grant.' : ''}
            </p>

            {context.isMainnet ? (
              <p
                role="note"
                /*
                 * The mainnet warning keeps its wash. It is the one notice here that concerns
                 * irreversible loss of real money, so it is the one place a tinted panel is
                 * earned rather than habitual.
                 */
                className="mt-3 rounded-control border border-caution/30 bg-caution-wash/15 px-3.5 py-2.5 text-2xs leading-5 text-caution"
              >
                Mainnet. Real funds. The spend ceiling below is the most this agent can ever
                move, so set it to an amount you would be comfortable losing.
              </p>
            ) : (
              <p className="mt-2.5 text-2xs leading-5 text-ink-faint">
                {context.network} ({context.nativeSymbol}). Test network, so no real funds are at
                risk, but every transaction below is genuine and verifiable on chain.
              </p>
            )}

            {/* ------------------------------ the terms ------------------------------ */}
            <div className="mt-6 space-y-5">
              <fieldset>
                <legend className="eyebrow flex items-center gap-2">
                  <Coins className="size-3.5 text-ink-faint" aria-hidden="true" />
                  Spend ceiling
                </legend>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {PRESET_CAPS.map((preset) => (
                    <ChoiceChip
                      key={preset.wei}
                      active={capWei === preset.wei}
                      onClick={() => {
                        setCapWei(preset.wei);
                      }}
                    >
                      {preset.label} {context.nativeSymbol}
                    </ChoiceChip>
                  ))}
                </div>
                <p className="mt-2 text-3xs leading-5 text-ink-faint">
                  Per day, rolling. The agent cannot exceed this, in any single call or in
                  total.
                </p>
              </fieldset>

              <fieldset className="border-t border-line pt-5">
                <legend className="eyebrow flex items-center gap-2">
                  <Clock className="size-3.5 text-ink-faint" aria-hidden="true" />
                  Expiry
                </legend>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {PRESET_DURATIONS.map((preset) => (
                    <ChoiceChip
                      key={preset.minutes}
                      active={durationMinutes === preset.minutes}
                      onClick={() => {
                        setDurationMinutes(preset.minutes);
                      }}
                    >
                      {preset.label}
                    </ChoiceChip>
                  ))}
                </div>
                <p className="mt-2 text-3xs leading-5 text-ink-faint">
                  Authority lapses on its own. An idle session cannot be used later.
                </p>
              </fieldset>

              <fieldset className="border-t border-line pt-5">
                <legend className="eyebrow flex items-center gap-2">
                  <Lock className="size-3.5 text-ink-faint" aria-hidden="true" />
                  Permitted contracts
                </legend>
                <div className="mt-2.5 space-y-2">
                  {presetTargets.map((preset) => (
                    <label
                      key={preset.address}
                      className="flex cursor-pointer items-start gap-2.5"
                    >
                      <input
                        type="checkbox"
                        checked={targets.includes(preset.address)}
                        onChange={() => {
                          toggleTarget(preset.address);
                        }}
                        className="mt-0.5 size-3.5 shrink-0 accent-amber"
                      />
                      <span className="min-w-0">
                        <span className="block text-xs text-ink-secondary">{preset.label}</span>
                        <span className="block text-3xs leading-5 text-ink-faint">
                          {preset.note}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                {/*
                 * Nothing selected is a blocked state, not a permissive default. An empty
                 * allowlist means "any contract" to the account contract, which is exactly the
                 * blanket access this product refuses. The API rejects it too; this says why
                 * before the request is made.
                 */}
                {targets.length === 0 ? (
                  <p role="alert" className="mt-2 text-3xs leading-5 text-caution">
                    Choose at least one. A session with no named contract would be authorised
                    for all of them.
                  </p>
                ) : null}
              </fieldset>
            </div>

            <div className="mt-7 space-y-2.5">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                disabled={targets.length === 0 || hire.isPending}
                onClick={() => {
                  if (!context) return;
                  hire.mutate({
                    networkName: context.network,
                    spendLimitWei: capWei,
                    spendPeriod: SPEND_PERIOD,
                    durationMinutes,
                    allowedTargets: targets,
                    gasSponsored: context.gasSponsored,
                  });
                }}
              >
                {hire.isPending ? <InlineSpinner label="Waiting for your approval" /> : 'Hire agent'}
              </Button>

              {hire.isPending ? (
                <p className="text-2xs leading-5 text-ink-faint">
                  Approve with your device, then this settles in a block. A few seconds.
                </p>
              ) : null}

              {hire.isError ? (
                <p role="alert" className="text-2xs leading-5 text-critical">
                  {describeWeb3Error(hire.error).title}. {describeWeb3Error(hire.error).detail}
                </p>
              ) : null}
            </div>
          </>
        )}

        {/* --------------------------- commission work --------------------------- */}
        {/*
         * Below the grant form, because the two are a sequence rather than alternatives: a grant
         * says what the agent may do, this asks it to do something and pays for the result. Both
         * are signed by the same passkey, and this one scopes its session to the escrow contracts
         * on its own rather than reusing whatever the form above selected.
         */}
        {context?.enabled ? (
          <CommissionForm
            agentId={agentId}
            agentName={agentName}
            providerAddress={providerAddress}
            context={context}
          />
        ) : null}

        {/* ---------------------------- granted authority ---------------------------- */}
        {live.length > 0 ? (
          <div className="mt-7 border-t border-line pt-5">
            <p className="eyebrow">Live authority</p>
            <ul className="mt-3 space-y-3">
              {live.map((session) => (
                <SessionRow
                  key={session.publicKey}
                  session={session}
                  explorerUrl={context?.explorerUrl ?? ''}
                  nativeSymbol={context?.nativeSymbol ?? ''}
                  onRevoke={() => {
                    if (!context) return;
                    revoke.mutate({
                      publicKey: session.publicKey,
                      networkName: context.network,
                    });
                  }}
                  isRevoking={revoke.isPending && revoke.variables?.publicKey === session.publicKey}
                />
              ))}
            </ul>
            {revoke.isError ? (
              <p role="alert" className="mt-2 text-2xs leading-5 text-critical">
                {describeWeb3Error(revoke.error).detail} The session is still active.
              </p>
            ) : null}
          </div>
        ) : null}

        {past.length > 0 ? (
          <div className="mt-6 border-t border-line pt-5">
            {/*
             * Kept rather than deleted. What was granted and when it was withdrawn is the
             * record that makes the safety claim checkable after the fact.
             */}
            <p className="eyebrow">Ended</p>
            <ul className="mt-3 space-y-2.5">
              {past.map((session) => (
                <li key={session.publicKey} className="flex items-baseline justify-between gap-3">
                  <span className="text-2xs text-ink-muted">
                    {session.status === 'revoked' ? 'Revoked' : 'Expired'}{' '}
                    {formatDate(session.revokedAt ?? session.expiresAt) ?? ''}
                  </span>
                  <TxLink
                    hash={session.revokedTxHash ?? session.grantedTxHash}
                    explorerUrl={context?.explorerUrl ?? ''}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */

function ChoiceChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'rounded-control border px-2.5 py-1.5 text-2xs font-medium transition-colors',
        active
          ? 'border-amber-dim bg-amber-wash/50 text-amber'
          : 'border-line bg-surface-raised text-ink-secondary hover:bg-surface-overlay hover:text-ink',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

/** One live session: what it may do, and the button that ends it. */
function SessionRow({
  session,
  explorerUrl,
  nativeSymbol,
  onRevoke,
  isRevoking,
}: {
  session: AgentSession;
  explorerUrl: string;
  nativeSymbol: string;
  onRevoke: () => void;
  isRevoking: boolean;
}) {
  /*
   * Wei to a decimal string without a float. `Number(wei) / 1e18` would be a rounding
   * decision in the field that describes someone's spending limit.
   */
  const capNative = formatWei(session.spendLimitWei);

  return (
    <li className="rounded-card border border-line bg-surface-inset p-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-ink">
          {capNative} {nativeSymbol}<span className="text-ink-faint"> / {session.spendPeriod}</span>
        </span>
        <Badge tone="positive">Active</Badge>
      </div>

      <dl className="mt-2.5 space-y-1 text-3xs leading-5 text-ink-faint">
        <div className="flex gap-1.5">
          <dt className="shrink-0">Expires</dt>
          <dd className="text-ink-muted">{formatDate(session.expiresAt) ?? 'unknown'}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="shrink-0">May call</dt>
          <dd className="min-w-0 text-ink-muted">
            {session.allowedCalls.map((target) => truncateAddress(target, 6)).join(', ')}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center justify-between gap-3">
        <TxLink hash={session.grantedTxHash} explorerUrl={explorerUrl} label="Grant" />
        <Button variant="secondary" size="xs" onClick={onRevoke} disabled={isRevoking}>
          {isRevoking ? (
            <InlineSpinner label="Revoking" />
          ) : (
            <>
              <RotateCcw className="size-3" aria-hidden="true" />
              Revoke
            </>
          )}
        </Button>
      </div>
    </li>
  );
}

function TxLink({
  hash,
  explorerUrl,
  label = 'Transaction',
}: {
  hash: string | null;
  explorerUrl: string;
  label?: string;
}) {
  /*
   * The relay can confirm a grant without surfacing a receipt, so a missing hash is a real
   * state rather than an error. Says which, instead of rendering a dead link.
   */
  if (hash === null || explorerUrl === '') {
    return <span className="text-3xs text-ink-faint">Confirmed, no receipt returned</span>;
  }

  return (
    <a
      href={`${explorerUrl}/tx/${hash}`}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 text-3xs text-ink-muted transition-colors hover:text-amber"
    >
      {label} on BscScan
      <ExternalLink className="size-2.5" aria-hidden="true" />
    </a>
  );
}

/**
 * Wei to a trimmed decimal string, using integer arithmetic.
 *
 * Exported for the test. `Number(wei) / 1e18` is the obvious version and it introduces a
 * float into the one number on this panel that states a spending limit.
 */
export function formatWei(wei: string, decimals = 18): string {
  const value = BigInt(wei);
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = (value % base).toString().padStart(decimals, '0').replace(/0+$/, '');

  return fraction === '' ? whole.toString() : `${whole.toString()}.${fraction}`;
}
