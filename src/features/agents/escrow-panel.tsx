'use client';

import { ExternalLink, ShieldCheck } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Panel, PanelHeader } from '../../components/ui/card';
import { InlineSpinner } from '../../components/ui/states';
import type { Agent, AgentJob, JobsContext } from '../../lib/api/contract';
import { formatDate } from '../../lib/utils/format';
import { useAgentJobs } from '../discovery/use-agents';
import { readTask, releaseDueAt, STATUS_MEANING } from './escrow-evidence';

/**
 * Escrow history — the hardest evidence on the page.
 *
 * Reputation records what a client said afterwards. A job records that a budget was locked in the
 * ERC-8183 kernel, delivered against, and released. One is testimony, the other is a payment, and
 * that is why this panel sits above reputation on the profile.
 *
 * Two things it must not do.
 *
 * It must not present a job as work. Creating a job and setting its budget cost nothing on this
 * kernel; only funding moves tokens, and anyone can create a job naming any provider. So the
 * headline figure is paid work, the funded count is the denominator, and jobs that were merely
 * named are shown separately and labelled as never funded.
 *
 * It must not let an absence read as a failure. 53 of the 317,476 indexed agents have any job at
 * all, so the empty state is what almost every agent shows, and an agent nobody has hired through
 * this rail yet is not an agent that failed. Same principle as the reputation panel: absence of
 * evidence, stated plainly, at full size.
 */
export function EscrowPanel({ agent }: { agent: Agent }) {
  const tally = agent.jobs;

  /*
   * The rows are only fetched when the tally says there is something to fetch. The tally rides
   * along with the agent, so the common case — no escrow — costs no request at all.
   */
  const jobsQuery = useAgentJobs(agent.identity.id, tally !== null);

  if (tally === null) {
    return (
      <Panel>
        <PanelHeader title="Paid work" />
        <div className="p-4 sm:p-5">
          <div className="rounded-card border border-dashed border-line-strong bg-surface-inset px-5 py-6">
            {/*
             * Set at the same scale a settled figure would have been. An absence stated quietly
             * reads as a missing feature; stated at full size it reads as a finding.
             */}
            <p className="display text-xl text-ink">Never hired through on-chain escrow</p>
            <p className="mt-2.5 max-w-lg text-xs leading-6 text-ink-muted">
              No ERC-8183 job names this agent as the provider. That is the case for almost every
              agent in the registry, so treat it as{' '}
              <strong className="font-medium text-ink-secondary">nothing recorded yet</strong>{' '}
              rather than as a poor track record.
            </p>
          </div>
        </div>
      </Panel>
    );
  }

  const meta = jobsQuery.data?.meta ?? null;
  const named = tally.total - tally.funded;

  return (
    <Panel>
      <PanelHeader
        title="Paid work"
        hint="Escrowed jobs on the ERC-8183 AgenticCommerce kernel. Read from chain, not self-reported."
        action={jobsQuery.isLoading ? <InlineSpinner label="Reading escrow" /> : null}
      />

      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="display tabular text-display-sm text-ink">{tally.settled}</span>
              <span className="display text-lg text-ink-faint">{tally.tokenSymbol}</span>
            </div>
            <p className="mt-2 text-2xs text-ink-muted">
              Released to this agent from escrow, across {tally.completed}{' '}
              {tally.completed === 1 ? 'job' : 'jobs'}
            </p>
          </div>

          <dl className="flex flex-wrap gap-x-8 gap-y-4">
            <div>
              <dt className="eyebrow">Jobs funded</dt>
              <dd className="display tabular mt-1.5 text-2xl text-ink">{tally.funded}</dd>
            </div>
            {tally.awaitingRelease > 0 ? (
              <div>
                <dt className="eyebrow">Awaiting release</dt>
                <dd className="display tabular mt-1.5 text-2xl text-ink">
                  {tally.awaitingRelease}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="eyebrow">Total escrowed</dt>
              <dd className="display tabular mt-1.5 text-2xl text-ink">
                {tally.escrowed}
                <span className="ml-1 text-sm text-ink-faint">{tally.tokenSymbol}</span>
              </dd>
            </div>
          </dl>
        </div>

        {/*
         * The gap between named and funded, said out loud when it exists. Without this the
         * headline count looks smaller than the job list for no visible reason.
         */}
        {named > 0 ? (
          <p className="mt-4 rounded-control border border-line bg-surface-inset px-3.5 py-2.5 text-2xs leading-5 text-ink-muted">
            A further {named} {named === 1 ? 'job was' : 'jobs were'} created naming this agent but
            never funded. Creating one costs nothing and needs no agreement from the agent, so those
            are left out of every figure above.
          </p>
        ) : null}

        {tally.awaitingRelease > 0 && meta ? (
          <p className="mt-3 text-2xs leading-5 text-ink-faint">
            Delivered work is held for {Math.round(meta.disputeWindowSeconds / 86_400)} days before
            the escrow can be released, so unpaid delivered jobs are expected rather than overdue.
          </p>
        ) : null}

        {jobsQuery.data && jobsQuery.data.data.length > 0 ? (
          <ul className="mt-5 space-y-2 border-t border-line pt-5">
            {jobsQuery.data.data.map((job) => (
              <JobRow key={job.jobId} job={job} meta={jobsQuery.data.meta} />
            ))}
          </ul>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <Badge tone="amber">
            <ShieldCheck className="size-3" aria-hidden="true" />
            ERC-8183 escrow
          </Badge>
          {tally.lastJobAt ? (
            <Badge tone="outline">Last job {formatDate(tally.lastJobAt)}</Badge>
          ) : null}
          {/* Verification without taking our word for it, which is the point of showing escrow. */}
          {meta ? (
            <a
              href={`${meta.explorerUrl}/address/${meta.commerceAddress}`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-2xs text-ink-muted transition-colors hover:text-amber"
            >
              Verify on the escrow contract
              <ExternalLink className="size-2.5" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * One job.
 *
 * Leads with what happened to the money rather than with the job id, because the status is the
 * evidence and the id is only useful for looking it up.
 */
function JobRow({ job, meta }: { job: AgentJob; meta: JobsContext }) {
  const meaning = STATUS_MEANING[job.status];
  const budget = formatBudget(job.budgetRaw, meta.tokenDecimals);

  /*
   * Shown for delivered work regardless of whether the date has passed, and deliberately not
   * compared against the clock. Reading `Date.now()` during render is impure: the server and the
   * browser would compute it at different moments and disagree, and the value would change on any
   * unrelated re-render. The date is the fact worth stating; the reader can see where today falls.
   */
  const dueAt = job.status === 'SUBMITTED' ? releaseDueAt(job, meta.disputeWindowSeconds) : null;

  return (
    <li className="rounded-control border border-line bg-surface-inset/60 px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <Badge tone={meaning.tone}>{meaning.label}</Badge>
        {/*
         * An unfunded job shows a dash rather than its budget. Printing the figure someone typed
         * into a job they never paid for, beside jobs that were funded, reads as money at stake.
         */}
        <span className="display tabular text-sm text-ink">
          {meaning.moneyMoved ? `${budget} ${meta.tokenSymbol}` : '—'}
        </span>
        <span className="font-mono text-3xs text-ink-faint">#{job.jobId}</span>
        {dueAt ? (
          <span className="text-3xs text-ink-faint">
            escrow releasable {formatDate(dueAt.toISOString())}
          </span>
        ) : null}
      </div>

      <p className="mt-2 line-clamp-2 text-xs leading-6 text-ink-secondary">{readTask(job.description)}</p>

      <p className="mt-1.5 text-3xs text-ink-faint">{meaning.detail}</p>
    </li>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Formats a raw token amount for a dense row.
 *
 * Trimmed to four decimals here rather than in the contract transform, which keeps the exact
 * value: budgets on this kernel run to 0.001 U and an amount rounded to two would show several
 * distinct jobs as identically 0.00.
 */
function formatBudget(raw: string, decimals: number): string {
  const whole = 10n ** BigInt(decimals);
  const value = BigInt(raw);
  const units = value / whole;
  const fraction = ((value % whole) * 10_000n) / whole;

  return fraction === 0n
    ? units.toString()
    : `${units.toString()}.${fraction.toString().padStart(4, '0').replace(/0+$/, '')}`;
}
