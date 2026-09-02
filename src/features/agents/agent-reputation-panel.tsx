import { BadgeCheck, Users } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Panel, PanelHeader, type PanelWeight } from '../../components/ui/card';
import { InlineSpinner } from '../../components/ui/states';
import type { Agent, ReputationDetail } from '../../lib/api/contract';
import { formatScore } from '../../lib/utils/format';

/**
 * The trust surface — the panel a hiring decision actually turns on.
 *
 * The single most important behaviour here is that **no feedback is not a zero
 * score**. An agent nobody has rated and an agent rated badly are entirely different
 * claims, and collapsing them would be the most damaging thing this product could do.
 * So the absent case gets its own explicit treatment rather than a greyed-out number.
 *
 * Provenance is always stated. `origin: 'chain'` means the registry was read live for
 * this request; `snapshot` means the live read failed and this is our cached copy. The
 * backend's own notes are rendered verbatim rather than reinterpreted here.
 */
export function AgentReputationPanel({
  agent,
  live,
  isLoading,
  weight = 'default',
}: {
  weight?: PanelWeight;
  agent: Agent;
  live: ReputationDetail | null;
  isLoading: boolean;
}) {
  // Prefer the live read; fall back to the snapshot embedded in the agent record so
  // the panel renders immediately instead of blocking on an RPC call.
  const snapshot = agent.reputation;
  const score = live ? live.score : (snapshot?.score ?? null);
  const feedbackCount = live?.feedbackCount ?? snapshot?.feedbackCount ?? 0;
  const clientCount = live?.clientCount ?? snapshot?.clientCount ?? 0;
  const rawValue = live ? live.summaryValue : (snapshot?.summaryValue ?? null);
  const rawDecimals = live ? live.summaryDecimals : (snapshot?.summaryDecimals ?? null);

  const hasEvidence = score !== null && feedbackCount > 0;

  return (
    <Panel weight={weight}>
      <PanelHeader
        level={3}
        title="Reputation"
        action={
          isLoading ? (
            <InlineSpinner label="Reading registry" />
          ) : live ? (
            <span className="inline-flex items-center gap-1.5 text-3xs text-ink-faint">
              <span
                className={
                  live.origin === 'chain'
                    ? 'size-1.5 rounded-pill bg-positive'
                    : 'size-1.5 rounded-pill bg-caution'
                }
                aria-hidden="true"
              />
              {live.origin === 'chain' ? 'Read live from registry' : 'Cached reading'}
            </span>
          ) : null
        }
      />

      <div className="p-4 sm:p-5">
        {hasEvidence ? (
          <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
            <div>
              {/*
               * The figure the entire product turns on, so it is set in the display face
               * at display scale. `tabular` keeps the digits from shifting width when a
               * live registry read replaces the cached snapshot mid-view.
               */}
              <div className="flex items-baseline gap-2">
                <span className="display tabular text-display-sm text-ink">
                  {formatScore(score)}
                </span>
                {/*
                 * 100, not 5. ERC-8004 defines a feedback score as 0–100; this read
                 * "/ 5" while the backend returned a correctly decoded 100, so a perfect
                 * record rendered as "100.00 / 5" — a real number on an invented scale.
                 */}
                <span className="display text-lg text-ink-faint">/ 100</span>
              </div>
              <p className="mt-2 text-2xs text-ink-muted">
                Mean of all non-revoked client feedback, on the 0–100 scale ERC-8004 defines
              </p>
            </div>

            <dl className="flex gap-8">
              <div>
                <dt className="eyebrow">Reviews</dt>
                <dd className="display tabular mt-1.5 text-2xl text-ink">{feedbackCount}</dd>
              </div>
              <div>
                <dt className="eyebrow">Unique clients</dt>
                <dd className="mt-1.5 flex items-center gap-2">
                  <Users className="size-3.5 text-ink-faint" aria-hidden="true" />
                  <span className="display tabular text-2xl text-ink">{clientCount}</span>
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          /*
           * The absent case, given real weight. Worded so a user cannot mistake it
           * for a poor score — that misreading is the whole risk.
           */
          <div className="rounded-card border border-dashed border-line-strong bg-surface-inset px-5 py-6">
            {/*
             * Set in the display face at the same weight the score would have had. An
             * absence stated quietly reads as a missing feature; stated at full size it
             * reads as a finding, which is what it is.
             */}
            <p className="display text-xl text-ink">No reputation evidence yet</p>
            <p className="mt-2.5 max-w-lg text-xs leading-6 text-ink-muted">
              No client has recorded feedback for this agent on the ERC-8004 reputation registry.
              This is an{' '}
              <strong className="font-medium text-ink-secondary">absence of evidence</strong>, not a
              low score. Treat it as an unknown when deciding whether to hire.
            </p>
          </div>
        )}

        {/* Provenance and the exact on-chain figure, for anyone who wants to verify. */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <Badge tone="amber">
            <BadgeCheck className="size-3" aria-hidden="true" />
            ERC-8004 reputation registry
          </Badge>
          {rawValue !== null && rawDecimals !== null ? (
            <Badge
              tone="outline"
              mono
              title="Fixed-point value exactly as the registry returned it"
            >
              raw {rawValue} @ {rawDecimals}dp
            </Badge>
          ) : null}
        </div>

        {live && live.notes.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {live.notes.map((note) => (
              <li key={note} className="text-2xs text-ink-faint">
                {note}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Panel>
  );
}
