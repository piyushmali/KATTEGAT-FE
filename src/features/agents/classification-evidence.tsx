import { CircleHelp, ScanSearch } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Panel, PanelHeader } from '../../components/ui/card';
import { CATEGORY_LABELS, type AgentCategoryAssignment } from '../../lib/api/contract';

/**
 * "Why this category?" — KATTEGAT's strongest differentiator, so it is not buried.
 *
 * ERC-8004 carries no category field, which means every category on this site is
 * derived by us. That is only defensible if the derivation is inspectable, so this
 * panel reports it like an evidence log: which rule fired, what matched, how
 * confident, and under which ruleset version.
 *
 * Signals are shown verbatim and in monospace — `capability:rebalance` is more
 * trustworthy to a technical reader than a prettified paraphrase would be, because it
 * is exactly what the classifier matched.
 */

const SIGNAL_KINDS: Record<string, { label: string; tone: 'amber' | 'info' | 'neutral' }> = {
  capability: { label: 'Declared capability', tone: 'amber' },
  phrase: { label: 'Description phrase', tone: 'info' },
  keyword: { label: 'Keyword', tone: 'neutral' },
  excluded: { label: 'Counter-signal', tone: 'neutral' },
};

function describeSignal(signal: string): { kind: string; value: string; tone: 'amber' | 'info' | 'neutral' } {
  const [rawKind, ...rest] = signal.split(':');
  const meta = SIGNAL_KINDS[rawKind ?? ''];
  return {
    kind: meta?.label ?? 'Signal',
    value: rest.join(':') || signal,
    tone: meta?.tone ?? 'neutral',
  };
}

export function ClassificationEvidence({
  categories,
}: {
  categories: AgentCategoryAssignment[];
}) {
  const unclassified =
    categories.length === 0 || categories.every((entry) => entry.category === 'uncategorized');

  return (
    <Panel>
      <PanelHeader
        title="Why this classification?"
        hint="ERC-8004 has no category field. KATTEGAT derives one and shows the evidence."
      />

      {unclassified ? (
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3 rounded-card border border-dashed border-line-strong bg-surface-inset p-4">
            <CircleHelp className="mt-0.5 size-4 shrink-0 text-ink-faint" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-ink">Not confidently classified</p>
              <p className="mt-1.5 max-w-lg text-xs leading-5 text-ink-muted">
                This agent’s declared capabilities and description did not match any category in
                the KATTEGAT taxonomy strongly enough to assign one. It is listed as unclassified
                rather than forced into the nearest bucket — a wrong category is worse than none,
                because you cannot tell it is wrong.
              </p>
              <p className="mt-2 font-mono text-3xs text-ink-faint">
                {categories[0]?.signals.join(', ') ?? 'no-signal-match'} ·{' '}
                {categories[0]?.classifierVersion ?? 'rules-v2'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {categories.map((assignment) => (
            <li key={assignment.category} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex items-center gap-2">
                  <ScanSearch
                    className={
                      assignment.isPrimary ? 'size-4 text-amber' : 'size-4 text-ink-faint'
                    }
                    aria-hidden="true"
                  />
                  <span className="text-sm font-semibold text-ink">
                    {CATEGORY_LABELS[assignment.category]}
                  </span>
                  {assignment.isPrimary ? (
                    <Badge tone="amber">Primary</Badge>
                  ) : (
                    <Badge tone="outline">Secondary</Badge>
                  )}
                </div>

                {/* Confidence as a bar plus a number: shape first, precision second. */}
                <div className="flex items-center gap-2">
                  <div
                    className="h-1 w-20 overflow-hidden rounded-pill bg-surface-overlay"
                    role="presentation"
                  >
                    <div
                      className={assignment.isPrimary ? 'h-full bg-amber' : 'h-full bg-ink-faint'}
                      style={{ width: `${String(Math.round(assignment.confidence * 100))}%` }}
                    />
                  </div>
                  <span className="tabular text-2xs text-ink-muted">
                    {Math.round(assignment.confidence * 100)}% confidence
                  </span>
                </div>
              </div>

              <ul className="mt-3 flex flex-wrap gap-1.5">
                {assignment.signals.map((signal) => {
                  const { kind, value, tone } = describeSignal(signal);
                  return (
                    <li key={signal}>
                      <Badge tone={tone} mono title={kind}>
                        {value}
                      </Badge>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-2.5 text-3xs text-ink-faint">
                Matched deterministically by ruleset{' '}
                <span className="font-mono">{assignment.classifierVersion}</span> — the same input
                always produces the same result.
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
