'use client';

import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { InlineSpinner } from '../../components/ui/states';
import type { HiringContext } from '../../lib/api/contract';
import { describeWeb3Error } from '../../lib/api/errors';
import { useCommissionWork } from './use-hiring';

/**
 * Commissioning escrowed work through ERC-8183.
 *
 * The other half of hiring. A session grant says what an agent *may* do; this asks it to do
 * something specific and locks the payment in the kernel until it delivers. It is the rail BNB
 * Agent Studio runs on, and the one that produces the paid-work evidence shown above.
 *
 * Nothing here is custodial. The five calls that create and fund the job are signed in the browser
 * by a session key the user's passkey just authorised, scoped to the three escrow contracts and
 * nothing else. The backend is told a job id afterwards and goes to read the kernel itself.
 *
 * Two states this is careful about. A budget of zero is a real protocol case rather than a
 * placeholder: it moves no tokens and skips the approve entirely, so it is offered honestly as a
 * way to exercise the rail. And when the network has no whitelisted policy, hiring is impossible,
 * so the form says so rather than presenting a button whose transaction reverts.
 */

/** Native allowance for the session, covering the relay's fee for the batch. */
const SESSION_ALLOWANCE_WEI = '10000000000000000';

/** Long enough to sign and land, short enough that a forgotten key expires on its own. */
const SESSION_MINUTES = 30;

export function CommissionForm({
  agentId,
  agentName,
  providerAddress,
  context,
}: {
  agentId: string;
  agentName: string;
  /** The agent's own wallet address. Null when it published none, which blocks hiring. */
  providerAddress: string | null;
  context: HiringContext;
}) {
  const commission = useCommissionWork(agentId);
  const [task, setTask] = useState('');
  const [budget, setBudget] = useState('0');
  /*
   * A funded job cannot be settled from here, and that has to be consented to rather than
   * discovered afterwards.
   *
   * KATTEGAT can create and fund a job. It cannot submit a deliverable, release the escrow or
   * raise a dispute: the escrow integration is read-only — `getJob`, `status`, `budget` — with no
   * `submit`, `release`, `dispute` or `refund` in the ABI, the API or this UI. So tokens locked
   * here stay locked as far as this product is concerned, whatever the kernel itself allows.
   *
   * Declared with the other hooks rather than beside the logic that uses it, because the early
   * returns below would make it conditional.
   */
  const [acceptLock, setAcceptLock] = useState(false);

  const escrow = context.escrow;

  if (!escrow.available) {
    return (
      <div className="mt-7 border-t border-line pt-5">
        <p className="eyebrow">Commission work</p>
        <p className="mt-2.5 text-2xs leading-5 text-ink-muted">
          The escrow kernel on {context.network} has no accepted dispute policy at the moment, so a
          job cannot be funded here. Escrow history above is unaffected.
        </p>
      </div>
    );
  }

  if (providerAddress === null) {
    return (
      <div className="mt-7 border-t border-line pt-5">
        <p className="eyebrow">Commission work</p>
        <p className="mt-2.5 text-2xs leading-5 text-ink-muted">
          {agentName} publishes no payment wallet, so the escrow kernel has no address to name as
          the provider. Nothing can be commissioned until it sets one.
        </p>
      </div>
    );
  }

  /*
   * Raw token units from a decimal figure, without a float.
   *
   * The token carries 18 decimals, so `Number(budget) * 1e18` loses the low digits of anything
   * but a round number. Pad the fraction and concatenate instead.
   */
  const toRawUnits = (value: string): string => {
    const [whole = '0', fraction = ''] = value.trim().split('.');
    const padded = fraction.padEnd(escrow.tokenDecimals, '0').slice(0, escrow.tokenDecimals);
    return `${BigInt(whole || '0').toString()}${padded}`.replace(/^0+(?=\d)/, '');
  };

  const budgetValid = /^\d+(\.\d+)?$/.test(budget.trim());

  /*
   * Whether this job would actually move tokens, decided on the raw units rather than the typed
   * string so "0.0" and "00" are recognised as zero.
   */
  const movesTokens = budgetValid && BigInt(toRawUnits(budget)) > 0n;

  /*
   * Zero-budget jobs need no acknowledgement and remain the honest default: they exercise the
   * whole rail, are real on chain, and put nothing at stake.
   */
  const ready =
    task.trim().length > 0 && budgetValid && (!movesTokens || acceptLock) && !commission.isPending;
  const result = commission.data?.job;

  return (
    <div className="mt-7 border-t border-line pt-5">
      <p className="eyebrow">Commission work</p>
      {/*
       * This used to say the payment "is released to {agentName} only after it delivers", which
       * described the protocol rather than this product. The kernel holds the escrow, but KATTEGAT
       * has no step that submits a deliverable or releases the funds, so the sentence promised a
       * settlement nothing here can perform.
       */}
      <p className="mt-2 text-2xs leading-5 text-ink-muted">
        Creates and funds a real ERC-8183 job on chain. The escrow contract holds the payment, never
        KATTEGAT — and releasing it to {agentName} is not a step this version can perform yet.
      </p>

      <label className="mt-4 block">
        <span className="text-2xs text-ink-secondary">The task</span>
        <textarea
          value={task}
          onChange={(event) => setTask(event.target.value)}
          rows={3}
          maxLength={4096}
          placeholder="Report whether PancakeSwap V3 position 7284200 is still in range."
          className="mt-1.5 w-full resize-y rounded-control border border-line bg-surface-inset px-3 py-2 text-xs leading-6 text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
        />
        {/* The kernel's own limit, so the field cannot produce a batch that reverts on length. */}
        <span className="mt-1 block text-3xs text-ink-faint">
          Written to the job on chain, up to 4096 bytes.
        </span>
      </label>

      <label className="mt-3 block">
        <span className="text-2xs text-ink-secondary">
          Budget in {escrow.tokenSymbol}
        </span>
        <input
          value={budget}
          onChange={(event) => setBudget(event.target.value)}
          inputMode="decimal"
          className="mt-1.5 w-full rounded-control border border-line bg-surface-inset px-3 py-2 font-mono text-xs text-ink focus:border-line-strong focus:outline-none"
        />
        <span className="mt-1 block text-3xs text-ink-faint">
          {!movesTokens
            ? /*
               * Said plainly rather than treated as an error. A zero-budget job is a documented
               * case in the protocol: it moves no tokens and skips the token approval, which makes
               * it the way to exercise the rail without holding any.
               */
              `Zero moves no tokens and needs no ${escrow.tokenSymbol}. The job is still real on chain. Recommended.`
            : `You must hold this much ${escrow.tokenSymbol}, and it cannot be recovered through KATTEGAT once locked.`}
        </span>
      </label>

      {/*
       * The dispute window is a real kernel parameter and worth stating, but it used to be phrased
       * as "stays yours to dispute until then" — an action this product does not offer. Reported as
       * the contract's own term instead of as a control the user has here.
       */}
      <p className="mt-3 rounded-control border border-line bg-surface-inset px-3 py-2.5 text-3xs leading-5 text-ink-muted">
        The kernel holds delivered work for{' '}
        {Math.max(1, Math.round(escrow.disputeWindowSeconds / 60))} minutes before the escrow may be
        released. That window is enforced by the contract; raising a dispute inside it is not
        available here.
      </p>

      {/*
       * Informed consent at a trust boundary, and the reason it is a checkbox rather than a
       * sentence: a paid job is the one action on this page that can lose something, and there is
       * no undo anywhere in the product.
       */}
      {movesTokens ? (
        <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-control border border-caution/30 bg-caution-wash/15 px-3 py-2.5">
          <input
            type="checkbox"
            checked={acceptLock}
            onChange={() => setAcceptLock((value) => !value)}
            className="mt-0.5 size-3.5 shrink-0 accent-amber"
          />
          <span className="text-3xs leading-5 text-caution">
            I understand this locks {budget.trim()} {escrow.tokenSymbol} in the escrow contract and
            that KATTEGAT cannot release, refund or dispute it. Use a budget of 0 to exercise the
            rail without putting tokens at stake.
          </span>
        </label>
      ) : null}

      <Button
        variant="primary"
        size="lg"
        className="mt-4 w-full"
        disabled={!ready}
        onClick={() => {
          commission.mutate({
            networkName: context.network,
            escrow,
            providerAddress: providerAddress as `0x${string}`,
            task: task.trim(),
            budgetRaw: toRawUnits(budget),
            spendLimitWei: SESSION_ALLOWANCE_WEI,
            durationMinutes: SESSION_MINUTES,
            gasSponsored: context.gasSponsored,
          });
        }}
      >
        {commission.isPending ? (
          <InlineSpinner label="Waiting for your approval" />
        ) : (
          'Fund the job'
        )}
      </Button>

      {commission.isPending ? (
        <p className="mt-2 text-2xs leading-5 text-ink-faint">
          Approve with your device. Five calls go out as one batch, so either the job is created and
          funded or nothing happens.
        </p>
      ) : null}

      {commission.isError ? (
        <p role="alert" className="mt-2 text-2xs leading-5 text-critical">
          {describeWeb3Error(commission.error).title}. {describeWeb3Error(commission.error).detail}
        </p>
      ) : null}

      {result ? (
        <div className="mt-3 rounded-control border border-positive/25 bg-positive-wash/15 px-3 py-2.5">
          <p className="text-2xs leading-5 text-positive">
            Job #{result.jobId} is {result.status.toLowerCase()} on chain{' '}
            {result.chainId}, verified against the kernel.
          </p>
          {/*
           * Said out loud when it applies. A hire on the session's chain is real, but on testnet
           * that is not the chain the catalogue was indexed from and the agent is not registered
           * there, so it will not appear in the paid-work figures above. Implying otherwise would
           * be inventing a track record.
           */}
          {!result.countsAsEvidence ? (
            <p className="mt-1.5 text-3xs leading-5 text-ink-muted">
              This network is not the one the catalogue is indexed from, so the job does not count
              toward this agent&rsquo;s public record.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
