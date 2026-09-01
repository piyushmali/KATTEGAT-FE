'use client';

import { useState } from 'react';
import { Clock, Coins, ExternalLink, Lock, RotateCcw, ShieldCheck } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Panel, PanelHeader } from '../../components/ui/card';
import { InlineSpinner, Skeleton } from '../../components/ui/states';
import { describeError } from '../../lib/api/errors';
import { formatDate } from '../../lib/utils/format';
import { truncateAddress } from '../../lib/web3/chain';
import type { AgentSession, SpendPeriod } from '../../lib/api/contract';
import { useAgentSessions, useGrantSession, useRevokeSession } from './use-hiring';

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
 * WHAT IS A SANDBOX, AND WHY IT SAYS SO
 *
 * The grant, the Keystore registration and the revocation are all real transactions on BSC
 * testnet. What is not real is whose account is at stake: the admin signer is a
 * KATTEGAT-operated key, so a visitor exercises the true mechanism against a sandbox rather
 * than their own wallet. `sandbox` comes from the API rather than being hardcoded here, so
 * the notice disappears by itself the day a browser signer makes it untrue.
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

/**
 * Contracts an agent can be scoped to, by name.
 *
 * A hex address is not a decision anyone can make, so the choice is offered as the venue it
 * belongs to. These are the BNB Chain routers and markets the launch categories actually
 * touch, which is also what Altana ships skills for.
 */
const PRESET_TARGETS = [
  {
    label: 'PancakeSwap router',
    address: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    note: 'Swaps and liquidity. What a grid or rebalancing agent needs.',
  },
  {
    label: 'Venus comptroller',
    address: '0xfD36E2c2a6789Db23113685031d7F16329158384',
    note: 'Lending positions. What a health-factor monitor needs.',
  },
] as const;

const SPEND_PERIOD: SpendPeriod = 'day';

export function HiringPanel({ agentId, agentName }: { agentId: string; agentName: string }) {
  const sessionsQuery = useAgentSessions(agentId);
  const grant = useGrantSession(agentId);
  const revoke = useRevokeSession(agentId);

  const [capWei, setCapWei] = useState<string>(PRESET_CAPS[1].wei);
  const [durationMinutes, setDurationMinutes] = useState<number>(PRESET_DURATIONS[0].minutes);
  const [targets, setTargets] = useState<string[]>([PRESET_TARGETS[0].address]);

  const data = sessionsQuery.data;
  const sessions = data?.sessions ?? [];
  const live = sessions.filter((session) => session.status === 'active');
  const past = sessions.filter((session) => session.status !== 'active');

  const toggleTarget = (address: string): void => {
    setTargets((current) =>
      current.includes(address)
        ? current.filter((entry) => entry !== address)
        : [...current, address],
    );
  };

  return (
    <Panel>
      <PanelHeader
        title="Hiring"
        action={
          data?.enabled ? (
            <Badge tone="positive">BNB testnet</Badge>
          ) : (
            <Badge tone="outline">Unavailable</Badge>
          )
        }
      />

      <div className="p-4 sm:p-5">
        <div className="flex size-10 items-center justify-center rounded-control border border-amber-dim/25 bg-amber-wash/35">
          <ShieldCheck className="size-4 text-amber" aria-hidden="true" />
        </div>

        {/*
         * The one sentence a user must not skim, because it is the difference between scoped
         * authority and handing over a wallet.
         */}
        <p className="display mt-4 text-lg leading-snug text-ink">
          Scoped authority, <em>not</em> wallet access
        </p>

        {sessionsQuery.isLoading ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        ) : !data?.enabled ? (
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

            {data.sandbox ? (
              <p
                role="note"
                className="mt-4 rounded-control border border-caution/30 bg-caution-wash/15 px-3.5 py-2.5 text-2xs leading-5 text-caution"
              >
                Sandbox. The grant, the Keystore entry and the revocation are real transactions
                on BSC testnet, but they act on a KATTEGAT-operated account rather than your
                connected wallet. You are exercising the real mechanism, not risking your own
                funds.
              </p>
            ) : null}

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
                      {preset.label} tBNB
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
                  {PRESET_TARGETS.map((preset) => (
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
                disabled={targets.length === 0 || grant.isPending}
                onClick={() => {
                  grant.mutate({
                    spendLimitWei: capWei,
                    spendPeriod: SPEND_PERIOD,
                    durationMinutes,
                    allowedTargets: targets,
                  });
                }}
              >
                {grant.isPending ? <InlineSpinner label="Granting on chain" /> : 'Hire agent'}
              </Button>

              {grant.isPending ? (
                <p className="text-2xs leading-5 text-ink-faint">
                  Waiting on BNB Chain. This takes a few seconds and settles in a block.
                </p>
              ) : null}

              {grant.isError ? (
                <p role="alert" className="text-2xs leading-5 text-critical">
                  {describeError(grant.error).title}. {describeError(grant.error).detail}
                </p>
              ) : null}
            </div>
          </>
        )}

        {/* ---------------------------- granted authority ---------------------------- */}
        {live.length > 0 ? (
          <div className="mt-7 border-t border-line pt-5">
            <p className="eyebrow">Live authority</p>
            <ul className="mt-3 space-y-3">
              {live.map((session) => (
                <SessionRow
                  key={session.publicKey}
                  session={session}
                  explorerUrl={data?.explorerUrl ?? ''}
                  onRevoke={() => {
                    revoke.mutate(session.publicKey);
                  }}
                  isRevoking={revoke.isPending && revoke.variables === session.publicKey}
                />
              ))}
            </ul>
            {revoke.isError ? (
              <p role="alert" className="mt-2 text-2xs leading-5 text-critical">
                {describeError(revoke.error).title}. The session is still active.
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
                    explorerUrl={data?.explorerUrl ?? ''}
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
  onRevoke,
  isRevoking,
}: {
  session: AgentSession;
  explorerUrl: string;
  onRevoke: () => void;
  isRevoking: boolean;
}) {
  /*
   * Wei to a decimal string without a float. `Number(wei) / 1e18` would be a rounding
   * decision in the field that describes someone's spending limit.
   */
  const capTBNB = formatWei(session.spendLimitWei);

  return (
    <li className="rounded-card border border-line bg-surface-inset p-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-ink">
          {capTBNB} tBNB<span className="text-ink-faint"> / {session.spendPeriod}</span>
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
