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
    detail: 'Only the specific actions you grant. Never blanket wallet access.',
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
      <PanelHeader title="Hiring" action={<Badge tone="outline">Preview</Badge>} />

      <div className="p-4 sm:p-5">
        <div>
          <div className="flex size-10 items-center justify-center rounded-control border border-amber-dim/25 bg-amber-wash/35">
            <ShieldCheck className="size-4 text-amber" aria-hidden="true" />
          </div>
          <div className="mt-4">
            {/*
             * The promise this panel exists to make, in the display voice. It is the one
             * sentence a user must not skim, because it is the difference between
             * scoped authority and handing over a wallet.
             */}
            <p className="display text-lg leading-snug text-ink">
              Scoped authority, <em>not</em> wallet access
            </p>
            <p className="mt-2.5 text-xs leading-6 text-ink-muted">
              When hiring goes live, putting {agentName} to work will grant it a bounded session,
              never open-ended access to your funds. You will see and approve every term below
              before anything is signed.
            </p>
          </div>
        </div>

        {/*
         * Divided by hairlines rather than boxed into four cards. These are the terms of
         * an agreement, so they should read as a list of clauses — nesting four bordered
         * tiles inside an already-bordered panel is the exact container stacking that
         * makes an interface look assembled rather than designed.
         */}
        <dl className="mt-6 space-y-4">
          {AUTHORITY_TERMS.map((term) => (
            <div key={term.label} className="border-t border-line pt-4">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-center gap-2">
                  <term.icon className="size-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
                  <dt className="eyebrow">{term.label}</dt>
                </div>
                <dd className="shrink-0 text-xs font-medium text-amber/90">{term.value}</dd>
              </div>
              <p className="mt-2 text-3xs leading-5 text-ink-muted">{term.detail}</p>
            </div>
          ))}
        </dl>

        <div className="mt-7 space-y-2.5">
          {/*
           * Disabled rather than absent: it communicates that hiring is the intended
           * destination of this page, while being honest that it does not work yet.
           * A live-looking button that did nothing would be worse than either.
           */}
          <Button
            variant="primary"
            size="lg"
            disabled
            title="Hiring is not enabled yet"
            className="w-full"
          >
            Hire agent
          </Button>
          <p className="text-2xs leading-5 text-ink-faint">
            Available once agent sessions ship on BNB Smart Chain.
          </p>
        </div>
      </div>
    </Panel>
  );
}
