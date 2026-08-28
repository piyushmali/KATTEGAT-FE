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
 * Feedback coverage, stated honestly.
 *
 * At the time of writing no agent in the index has on-chain feedback, and that is a
 * genuinely interesting fact about how early this ecosystem is — so it is reported
 * plainly rather than hidden because the number is zero. Zero *recorded reviews* is a
 * real measurement; it is not the same as giving an agent a zero score.
 */
export function FeedbackCoverage() {
  const { data, isLoading, isError } = useStats();
  if (isError || isLoading || !data) return null;

  return (
    <p className="text-xs leading-6 text-ink-muted">
      {data.feedbackRecords === 0 ? (
        <>
          No on-chain feedback has been recorded against any indexed agent yet. KATTEGAT reports
          that as an absence of evidence — never as a zero rating.
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
          rated agents, read from the ERC-8004 reputation registry.
        </>
      )}
    </p>
  );
}
