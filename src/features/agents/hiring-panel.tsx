import { Clock, Coins, Lock, RotateCcw, ShieldCheck } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Panel, PanelHeader } from '../../components/ui/card';

/**
 * Controlled hiring.
 *
 * Hiring is not wired to a contract yet, and this panel does not pretend otherwise —
 * but "not enabled" as a bare sentence makes a product look abandoned. So this shows
 * the authority model the hire flow will enforce, clearly marked as a preview.
 *
 * The framing is deliberate and is the safety principle in the brief: KATTEGAT never
 * offers to give an agent access to a wallet. It offers to grant *explicitly scoped
 * authority* — a spend ceiling, an expiry, an enumerated permission set, and
 * revocation. A user should finish reading this panel knowing exactly what an agent
 * could and could not do with their funds.
 */

const AUTHORITY_TERMS = [
  {
    icon: Coins,
    label: 'Spend ceiling',
    value: 'You set the cap',
    detail: 'The agent can never move more than the amount you approve, in the asset you choose.',
  },
  {
    icon: Clock,
    label: 'Session expiry',
    value: 'Time-boxed',
    detail: 'Authority lapses automatically. An idle session cannot be used later.',
  },
  {
    icon: Lock,
    label: 'Permission scope',
    value: 'Enumerated',
    detail: 'Only the specific actions you grant — never blanket wallet access.',
  },
  {
    icon: RotateCcw,
    label: 'Revocation',
    value: 'Any time',
    detail: 'Withdraw authority in one transaction, without waiting for expiry.',
  },
] as const;

export function HiringPanel({ agentName }: { agentName: string }) {
  return (
    <Panel>
      <PanelHeader
        title="Hiring"
        action={<Badge tone="outline">Preview — not yet live</Badge>}
      />

      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-control bg-amber-wash/40">
            <ShieldCheck className="size-4 text-amber" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">Scoped authority, not wallet access</p>
            <p className="mt-1.5 text-xs leading-5 text-ink-muted">
              When hiring goes live, putting {agentName} to work will grant it a bounded session —
              never open-ended access to your funds. You will see and approve every term below
              before anything is signed.
            </p>
          </div>
        </div>

        <dl className="mt-4 grid gap-2 sm:grid-cols-2">
          {AUTHORITY_TERMS.map((term) => (
            <div
              key={term.label}
              className="rounded-card border border-line bg-surface-inset p-3"
            >
              <div className="flex items-center gap-2">
                <term.icon className="size-3.5 text-ink-faint" aria-hidden="true" />
                <dt className="text-2xs tracking-wide text-ink-faint uppercase">{term.label}</dt>
              </div>
              <dd className="mt-1.5 text-xs font-medium text-ink">{term.value}</dd>
              <p className="mt-1 text-3xs leading-4 text-ink-muted">{term.detail}</p>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {/*
           * Disabled rather than absent: it communicates that hiring is the intended
           * destination of this page, while being honest that it does not work yet.
           * A live-looking button that did nothing would be worse than either.
           */}
          <Button variant="primary" size="md" disabled title="Hiring is not enabled yet">
            Hire agent
          </Button>
          <span className="text-2xs text-ink-faint">
            Available once agent sessions ship on BNB Smart Chain.
          </span>
        </div>
      </div>
    </Panel>
  );
}
