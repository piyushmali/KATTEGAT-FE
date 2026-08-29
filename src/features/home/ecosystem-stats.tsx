'use client';

import { Skeleton } from '../../components/ui/states';
import { formatCount } from '../../lib/utils/format';
import { useStats } from '../discovery/use-agents';

/**
 * Live marketplace counts.
 *
 * Every figure comes from `GET /api/v1/stats` and is a real count over indexed data.
 * There is deliberately no total-value-managed, success-rate or transaction-volume
 * figure here: ERC-8004 exposes none of them, and a fabricated stat card would
 * contradict the one thing this product is selling.
 *
 * Where a count is a *claim by the agent* rather than an observation — `declaredActive`
 * comes from the agent's own registration file — the label says so.
 */
export function EcosystemStats() {
  const { data, isLoading, isError } = useStats();

  // A failed stats call must not break the landing page; the section simply stands down.
  if (isError) return null;

  const items = [
    {
      label: 'Indexed agents',
      value: data?.indexedAgents,
      note: 'ERC-8004 identity registry',
    },
    {
      label: 'Classified',
      value: data?.classifiedAgents,
      note: `across ${String(data?.activeCategories ?? 0)} categories`,
    },
    {
      label: 'Declared active',
      value: data?.declaredActive,
      // Precise wording: this is what the agent says, not what we measured.
      note: 'self-reported by the agent',
    },
    {
      label: 'Distinct owners',
      value: data?.ownerCount,
      note: 'unique controlling addresses',
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-line bg-line lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-surface-raised px-4 py-4 sm:px-5 sm:py-5">
          <dt className="text-2xs tracking-wide text-ink-faint uppercase">{item.label}</dt>
          <dd className="mt-2">
            {isLoading || item.value === undefined ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <span className="tabular text-2xl leading-none font-semibold tracking-tight text-ink">
                {formatCount(item.value)}
              </span>
            )}
          </dd>
          <p className="mt-1.5 text-3xs text-ink-faint">{item.note}</p>
        </div>
      ))}
    </dl>
  );
}

/**
 * The same counts, compressed to one line for the base of the hero.
 *
 * The hero is now mostly negative space, which is the point — but a landing page whose
 * first viewport contains no evidence is exactly the "trust us" gesture this product
 * exists to refuse. Three real counts on a hairline keep the fold honest without
 * competing with the headline.
 *
 * Reuses `useStats`, so this costs no additional request: TanStack Query serves both
 * this and the full grid below from one cache entry.
 */
export function HeroIndexStrip() {
  const { data, isError } = useStats();

  // Never a blocker on the fold: no counts simply means no strip.
  if (isError || !data) return null;

  const items = [
    { label: 'agents indexed', value: data.indexedAgents },
    { label: 'classified', value: data.classifiedAgents },
    { label: 'distinct owners', value: data.ownerCount },
  ];

  return (
    <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-2">
          <dd className="tabular text-base font-medium text-ink">{formatCount(item.value)}</dd>
          <dt className="text-2xs tracking-wide text-ink-faint">{item.label}</dt>
        </div>
      ))}
    </dl>
  );
}

/**
 * Feedback coverage — a measurement of KATTEGAT's index, not a claim about the chain.
 *
 * The distinction is load-bearing and this component previously got it wrong. Reputation
 * is read from the registry lazily, when someone opens an agent's page, so this counter
 * reflects how much of the index has been *looked at* rather than how much feedback
 * exists on BNB Smart Chain. The earlier copy said "no on-chain feedback has been
 * recorded against any indexed agent", which read as a finding about the ecosystem while
 * really describing our own cache — and it was false: agents 56:1 through 56:3 each carry
 * real registry feedback that simply had not been read yet.
 *
 * So the scope is now stated in the sentence. Zero *read so far* is an honest
 * measurement; "none exists" was not ours to assert.
 */
export function FeedbackCoverage() {
  const { data, isLoading, isError } = useStats();
  if (isError || isLoading || !data) return null;

  return (
    <p className="text-xs leading-6 text-ink-muted">
      {data.feedbackRecords === 0 ? (
        <>
          No client feedback has been read into KATTEGAT&rsquo;s index yet. Reputation is fetched
          from the registry when an agent&rsquo;s page is opened, so this counts what has been
          read — not what exists on chain.
        </>
      ) : (
        <>
          <span className="tabular font-medium text-ink">
            {formatCount(data.feedbackRecords)}
          </span>{' '}
          feedback records across{' '}
          <span className="tabular font-medium text-ink">
            {formatCount(data.ratedAgents)}
          </span>{' '}
          {data.ratedAgents === 1 ? 'agent' : 'agents'} read so far from the ERC-8004 reputation
          registry. Coverage grows as agents are opened, so this is a floor rather than a total.
        </>
      )}
    </p>
  );
}
