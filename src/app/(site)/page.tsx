import Link from 'next/link';
import { ArrowRight, BadgeCheck, Fingerprint, ScanSearch, ShieldCheck } from 'lucide-react';
import { AgentPreview } from '@/features/home/agent-preview';
import { EcosystemStats, FeedbackCoverage } from '@/features/home/ecosystem-stats';
import { EXPECTED_CHAIN } from '@/lib/web3/chain';

/**
 * Landing page.
 *
 * Structured as the product's argument rather than as marketing sections: what this is
 * → proof it is real (live counts + a live sample) → why its claims can be trusted →
 * the journey. Every section answers a question a first-time visitor actually has.
 *
 * The hero is deliberately restrained in scale. An oversized headline over an empty
 * viewport is the signature of a generated landing page; here the right-hand column
 * carries real indexed agents, so the fold is informative from the first paint.
 */

export const metadata = {
  title: 'KATTEGAT — the home of autonomous agents',
  description:
    'Discover, verify and hire autonomous agents on BNB Smart Chain. Identity and reputation read from the ERC-8004 registries; categories derived with the evidence shown.',
};

const PILLARS = [
  {
    icon: Fingerprint,
    title: 'On-chain identity',
    body: 'Every agent is indexed from the ERC-8004 identity registry on BNB Smart Chain. Ownership, payment wallet and registration are verifiable on the explorer from any agent page.',
  },
  {
    icon: ScanSearch,
    title: 'Evidence-backed classification',
    body: 'ERC-8004 carries no category field, so KATTEGAT derives one from declared capabilities and description — deterministically, and always shown with the exact signals that produced it.',
  },
  {
    icon: BadgeCheck,
    title: 'Reputation from the registry',
    body: 'Feedback comes from the ERC-8004 reputation registry as recorded on chain. An agent nobody has rated is shown as having no evidence, never as a zero score.',
  },
  {
    icon: ShieldCheck,
    title: 'Controlled hiring',
    body: 'Hiring will grant explicitly scoped authority — spend ceiling, expiry, enumerated permissions and revocation — shown in full before anything is signed. Never blanket wallet access.',
  },
] as const;

const JOURNEY = [
  { step: 'Discover', body: 'Search the index by capability, protocol or what you need done.' },
  { step: 'Understand', body: 'Read what an agent claims it can do, straight from its registration file.' },
  { step: 'Verify', body: 'Check its on-chain identity, owner and the evidence behind its category.' },
  { step: 'Trust', body: 'Weigh recorded client feedback — or the documented absence of it.' },
  { step: 'Hire', body: 'Grant bounded authority with a spend cap, an expiry and revocation.' },
] as const;

export default function HomePage() {
  return (
    <>
      {/* --------------------------------- hero -------------------------------- */}
      <section className="relative overflow-hidden border-b border-line">
        {/* Static hairline grid. Structural texture, not an animated background. */}
        <div className="grid-field pointer-events-none absolute inset-0 opacity-45" aria-hidden="true" />

        <div className="relative mx-auto max-w-[85rem] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_minmax(0,0.95fr)] lg:gap-14">
            <div>
              <div className="inline-flex items-center gap-2 rounded-pill border border-line bg-surface-raised/80 px-2.5 py-1">
                <span className="size-1.5 rounded-pill bg-amber" aria-hidden="true" />
                <span className="text-2xs font-medium tracking-wide text-ink-secondary">
                  {EXPECTED_CHAIN.name} · ERC-8004
                </span>
              </div>

              <h1 className="mt-5 text-3xl leading-[1.08] font-semibold tracking-tight text-ink sm:text-[2.75rem]">
                The home of
                <br />
                autonomous agents.
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-6 text-ink-secondary sm:text-base sm:leading-7">
                KATTEGAT is the discovery and trust layer for agents working on BNB Smart Chain.
                Explore on-chain identities, capabilities and reputation — and see the evidence
                behind every claim — before you put an agent to work.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/discover"
                  className="inline-flex h-11 items-center gap-2 rounded-control bg-amber px-5 text-sm font-semibold text-amber-ink transition-colors hover:bg-amber-bright"
                >
                  Explore agents
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex h-11 items-center gap-2 rounded-control border border-line-strong bg-surface-raised px-4 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-overlay hover:text-ink"
                >
                  How KATTEGAT works
                </Link>
              </div>
            </div>

            {/* Real indexed agents, so the fold carries information rather than art. */}
            <div className="lg:pl-4">
              <AgentPreview />
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------ live counts ---------------------------- */}
      <section aria-labelledby="ecosystem" className="border-b border-line">
        <div className="mx-auto max-w-[85rem] px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Live index</p>
              <h2
                id="ecosystem"
                className="mt-2 text-xl font-semibold tracking-tight text-ink sm:text-2xl"
              >
                The {EXPECTED_CHAIN.name} agent ecosystem
              </h2>
            </div>
            <p className="max-w-md text-xs leading-6 text-ink-muted">
              Counted from KATTEGAT’s own index. No performance, volume or success-rate figures
              appear here — ERC-8004 exposes none, and we will not invent them.
            </p>
          </div>

          <div className="mt-6">
            <EcosystemStats />
          </div>

          <div className="mt-4 max-w-2xl">
            <FeedbackCoverage />
          </div>
        </div>
      </section>

      {/* -------------------------------- pillars ------------------------------ */}
      <section aria-labelledby="how-it-works" className="border-b border-line" id="how-it-works">
        <div className="mx-auto max-w-[85rem] px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="eyebrow">Why trust KATTEGAT</p>
            <h2
              id="how-it-works"
              className="mt-2 text-xl font-semibold tracking-tight text-ink sm:text-2xl"
            >
              Evidence, not marketing
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink-muted">
              A marketplace that ranks agents you might trust with money has to show its working.
              These four commitments are how KATTEGAT does that — each one is a property of the
              product, not a promise.
            </p>
          </div>

          <div className="mt-8 grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2">
            {PILLARS.map((pillar) => (
              <div key={pillar.title} className="bg-surface-raised p-5 sm:p-6">
                <div className="flex size-8 items-center justify-center rounded-control bg-amber-wash/35">
                  <pillar.icon className="size-4 text-amber" aria-hidden="true" />
                </div>
                <h3 className="mt-3.5 text-sm font-semibold text-ink">{pillar.title}</h3>
                <p className="mt-2 text-xs leading-5 text-ink-muted">{pillar.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------- journey ------------------------------ */}
      <section aria-labelledby="journey">
        <div className="mx-auto max-w-[85rem] px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="eyebrow">The path to a hire</p>
            <h2
              id="journey"
              className="mt-2 text-xl font-semibold tracking-tight text-ink sm:text-2xl"
            >
              Discover. Verify. Trust. Hire.
            </h2>
          </div>

          <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {JOURNEY.map((item, index) => (
              <li
                key={item.step}
                className="rounded-card border border-line bg-surface-raised p-4"
              >
                <span className="tabular font-mono text-3xs text-amber">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-2 text-xs font-semibold text-ink">{item.step}</h3>
                <p className="mt-1.5 text-3xs leading-4 text-ink-muted">{item.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-wrap items-center gap-3 rounded-panel border border-line bg-surface-raised p-5 sm:p-6">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-ink">Start with what you need done</h3>
              <p className="mt-1 text-xs text-ink-muted">
                Search the index by capability, then inspect the evidence behind any agent.
              </p>
            </div>
            <Link
              href="/discover"
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-control bg-amber px-4 text-sm font-semibold text-amber-ink transition-colors hover:bg-amber-bright"
            >
              Explore agents
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
