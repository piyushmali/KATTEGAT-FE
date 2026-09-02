'use client';

import { Counter } from '../../components/ui/counter';
import { Skeleton } from '../../components/ui/states';
import { formatCount } from '../../lib/utils/format';
import { useStats } from '../discovery/use-agents';

/**
 * How long ago the index was last advanced, in words.
 *
 * The point of showing this is that it is the one figure on the page that proves the others
 * are being maintained. A pulsing dot on its own is theatre; a pulsing dot next to "indexed
 * 6 minutes ago", read from `last_indexed_at`, is a status light.
 *
 * Returns null rather than "just now" when the timestamp is missing or unparseable, because
 * silence is the honest output there and this product does not invent freshness.
 */
function describeFreshness(iso: string | null): string | null {
  if (iso === null) return null;

  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;

  const minutes = Math.floor((Date.now() - then) / 60_000);
  if (minutes < 1) return 'moments ago';
  if (minutes < 60) return `${String(minutes)} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${String(hours)} ${hours === 1 ? 'hour' : 'hours'} ago`;

  const days = Math.floor(hours / 24);
  return `${String(days)} ${days === 1 ? 'day' : 'days'} ago`;
}

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

  /*
   * Figures at display scale on hairlines, with no box around them.
   *
   * This section used to disagree with `HeroIndexStrip` twenty lines below it, which had
   * already worked out the right answer: the number is the persuasive thing, so it should be
   * the largest thing. Here the same counts sat at `text-2xl` in the sans face inside four
   * filled cells with a border around the set — a stat widget, and a smaller number than the
   * one in the hero it was meant to expand on.
   *
   * The container is gone. Four figures divided by rules need no frame, and removing it lets
   * them sit directly on the page's own ground rather than on a lighter surface floating over
   * it. Columns are deliberately unequal: the indexed total is the headline count and the
   * other three qualify it, so it gets the wider measure.
   *
   * Rules run horizontally when the grid stacks and vertically when it does not, so the
   * division always reads along the axis the eye is travelling.
   */
  const freshness = describeFreshness(data?.lastIndexedAt ?? null);

  return (
    <>
      {/*
       * The status line above the figures, and the thing that makes them read as an index
       * rather than as copy. A pulse on its own would be theatre; a pulse beside a real
       * `last_indexed_at` is a status light, and it is the only figure here that says the
       * other four are being maintained.
       */}
      {freshness ? (
        <p className="mb-7 flex items-center gap-2 text-2xs text-ink-faint">
          <span className="animate-live size-1 shrink-0 rounded-pill bg-positive" aria-hidden="true" />
          <span>
            Index advanced <span className="text-ink-secondary">{freshness}</span>
          </span>
        </p>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-9 lg:grid-cols-[1.3fr_1fr_1fr_1fr] lg:gap-x-0">
      {items.map((item) => (
        <div
          key={item.label}
          /*
           * Whitespace divides the stacked layout and rules divide the single row. Drawing
           * rules at both sizes needs them on different edges per breakpoint, and the
           * two-column case ends up with a rule above the second cell only, which reads as
           * a mistake. Air is the better divider when the grid wraps anyway.
           */
          className="lg:border-l lg:border-line lg:pl-6 lg:first:border-l-0 lg:first:pl-0"
        >
          <dt className="eyebrow">{item.label}</dt>
          <dd className="mt-3">
            {isLoading || item.value === undefined ? (
              <Skeleton className="h-9 w-28" />
            ) : (
              <Counter value={item.value} className="display text-display-sm text-ink" />
            )}
          </dd>
          <p className="mt-2 text-3xs text-ink-faint">{item.note}</p>
        </div>
      ))}
      </dl>
    </>
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

  /*
   * Figures given real size and set in the display face, divided by hairline rules.
   *
   * They previously sat inline at body size beside a muted label, which made 317,476
   * agents look like a footnote. The number is the single most persuasive fact on the
   * page, so it is now the largest thing in the strip, with the label subordinate beneath
   * it rather than competing alongside.
   */
  return (
    <dl className="grid grid-cols-3 gap-px overflow-hidden bg-line">
      {items.map((item) => (
        <div key={item.label} className="bg-void px-1 pr-4 first:pl-0 sm:pr-6">
          <dd className="display text-2xl leading-none text-ink sm:text-3xl">
            <Counter value={item.value} />
          </dd>
          <dt className="eyebrow mt-2.5">{item.label}</dt>
        </div>
      ))}
    </dl>
  );
}

/**
 * Feedback coverage, stated against the share of the catalogue it was measured over.
 *
 * The scope is load-bearing and this component has been wrong about it twice. It first said
 * "no on-chain feedback has been recorded against any indexed agent", which read as a
 * finding about the ecosystem while describing our own cache, and was false: agents 56:1
 * through 56:3 each carry real registry feedback nobody had read. The fix at the time was to
 * say "read so far", which was honest but useless, because reputation was only read when a
 * visitor opened a profile and that came to 130 agents out of 317,476.
 *
 * A batch sweep now reads the whole catalogue, so the figure can finally be reported with
 * its denominator. "412 of 317,476 agents swept carry feedback" is a finding. "412 agents
 * read so far" was an apology.
 */
export function FeedbackCoverage() {
  const { data, isLoading, isError } = useStats();
  if (isError || isLoading || !data) return null;

  const swept = data.reputationSwept;
  const share = data.indexedAgents > 0 ? Math.round((swept / data.indexedAgents) * 100) : 0;

  return (
    <p className="text-xs leading-6 text-ink-muted">
      {swept === 0 ? (
        <>
          Reputation has not been read from the registry yet, so KATTEGAT cannot say how much
          client feedback exists. This is a gap in the index, not a finding about the agents.
        </>
      ) : (
        <>
          <span className="tabular font-medium text-ink">{formatCount(data.feedbackRecords)}</span>{' '}
          feedback records across{' '}
          <span className="tabular font-medium text-ink">{formatCount(data.ratedAgents)}</span>{' '}
          {data.ratedAgents === 1 ? 'agent' : 'agents'}, from{' '}
          <span className="tabular font-medium text-ink">{formatCount(swept)}</span> read out of the
          ERC-8004 reputation registry so far.{' '}
          {share >= 99 ? (
            <>
              That is the whole catalogue, so an agent shown without feedback genuinely has none
              recorded.
            </>
          ) : (
            <>
              The sweep has covered {share}% of indexed agents and continues, so an agent shown
              without feedback may simply not have been reached yet.
            </>
          )}
        </>
      )}
    </p>
  );
}
