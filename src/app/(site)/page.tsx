import Link from 'next/link';
import { ArrowRight, BadgeCheck, Fingerprint, ScanSearch, ShieldCheck } from 'lucide-react';
import { AgentPreview } from '@/features/home/agent-preview';
import { EcosystemStats, FeedbackCoverage, HeroIndexStrip } from '@/features/home/ecosystem-stats';
import { HarbourAtmosphere } from '@/features/home/harbour-atmosphere';
import { Reveal } from '@/components/ui/reveal';
import { EXPECTED_CHAIN } from '@/lib/web3/chain';

/**
 * Landing page.
 *
 * Structured as the product's argument rather than as marketing sections: what this is
 * → what has arrived → proof it is real → why its claims can be trusted → the path to a
 * hire. Every section answers a question a first-time visitor actually has.
 *
 * The hero is now a composition rather than a two-column block: a monumental headline
 * held in a lot of empty air, with the harbour suggested behind it. An earlier revision
 * kept a live agent panel on the fold to stop the hero reading as generated
 * marketing — that instinct was right, but a full panel beside the headline is what was
 * flattening the composition. The counts survive as a hairline strip at the base of the
 * hero instead, so the first viewport still carries real evidence, and the live arrivals
 * get their own section with room to breathe.
 */

/*
 * No `title` here on purpose. The root layout's `title.template` is `%s · KATTEGAT`, so
 * naming the brand again produced "KATTEGAT — … · KATTEGAT" in the tab and in every
 * share preview. Omitting it falls through to `title.default`, which is the one place
 * the full positioning statement should live.
 */
export const metadata = {
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
  {
    step: 'Understand',
    body: 'Read what an agent claims it can do, straight from its registration file.',
  },
  { step: 'Verify', body: 'Check its on-chain identity, owner and the evidence behind its category.' },
  { step: 'Trust', body: 'Weigh recorded client feedback — or the documented absence of it.' },
  { step: 'Hire', body: 'Grant bounded authority with a spend cap, an expiry and revocation.' },
] as const;

export default function HomePage() {
  return (
    <>
      {/* --------------------------------- hero -------------------------------- */}
      {/*
       * Sized in `svh` rather than `vh` so mobile browser chrome cannot push the
       * composition below the fold, and capped so it never becomes a wall on a short
       * laptop. `min-h` rather than `h`, because the content must always win.
       */}
      <section className="relative isolate flex min-h-[min(88svh,46rem)] items-end overflow-hidden">
        <HarbourAtmosphere />

        <div className="relative mx-auto w-full max-w-shell px-4 pt-24 pb-14 sm:px-6 lg:px-8 lg:pt-32 lg:pb-20">
          {/*
           * Asymmetric on purpose. The headline occupies roughly two thirds and is
           * pushed to the baseline of the section, so the empty air above it reads as
           * sky rather than as an unfinished layout.
           */}
          <div className="max-w-4xl">
            <Reveal>
              <p className="eyebrow flex items-center gap-2.5">
                <span className="size-1 rounded-pill bg-amber" aria-hidden="true" />
                {EXPECTED_CHAIN.name}
                <span className="text-line-strong" aria-hidden="true">
                  /
                </span>
                ERC-8004
              </p>
            </Reveal>

            <Reveal delay={90}>
              {/*
               * The product's one monumental statement. Set in the display serif, and
               * the only place on the site that uses the largest step — scale is a
               * hierarchy signal, so spending it twice would spend it badly.
               */}
              <h1 className="display mt-6 text-display-xl text-ink">
                The harbour for
                <br />
                <em>intelligent</em> agents.
              </h1>
            </Reveal>

            <Reveal delay={180}>
              <p className="mt-8 max-w-reading text-sm leading-7 text-ink-secondary sm:text-base">
                KATTEGAT is the discovery and trust layer for autonomous agents working on{' '}
                {EXPECTED_CHAIN.name}. Inspect on-chain identity, declared capability and recorded
                reputation — and see the evidence behind every claim — before you put an agent to
                work.
              </p>
            </Reveal>

            <Reveal delay={260}>
              <div className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-3">
                {/*
                 * One primary action, unmistakable. Amber appears exactly once in this
                 * viewport so there is no question what to click.
                 */}
                <Link
                  href="/discover"
                  className="group inline-flex h-12 items-center gap-2.5 rounded-control bg-amber px-6 text-sm font-semibold text-amber-ink shadow-pop transition-colors duration-200 hover:bg-amber-bright"
                >
                  Explore the harbour
                  <ArrowRight
                    className="size-4 transition-transform duration-300 ease-fjord group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>

                {/*
                 * Secondary action as editorial text with a rule that draws itself,
                 * rather than a second button. Two buttons side by side is what makes a
                 * hero read like a template.
                 */}
                <Link
                  href="#how-it-works"
                  className="group inline-flex h-12 items-center px-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
                >
                  <span className="relative">
                    How KATTEGAT works
                    <span
                      className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-amber-dim transition-transform duration-500 ease-fjord group-hover:scale-x-100"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </div>
            </Reveal>
          </div>

          {/* Real counts, on a hairline. Keeps the fold evidential. */}
          <Reveal delay={340}>
            <div className="mt-14 border-t border-line pt-6 lg:mt-20">
              <HeroIndexStrip />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------- arrivals ------------------------------ */}
      <section aria-labelledby="arrivals" className="border-t border-line">
        <div className="mx-auto max-w-shell px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,30rem)] lg:items-end lg:gap-16">
            <Reveal>
              <div>
                <p className="eyebrow">Arrivals</p>
                <h2 id="arrivals" className="display mt-3 text-display-md text-ink">
                  Newly registered
                </h2>
                <p className="mt-4 max-w-reading text-sm leading-6 text-ink-muted">
                  The most recent identities to appear in the ERC-8004 registry on{' '}
                  {EXPECTED_CHAIN.name}, read from KATTEGAT&rsquo;s own index. Each one links
                  straight to its evidence.
                </p>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <AgentPreview />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------------ live counts ---------------------------- */}
      <section aria-labelledby="ecosystem" className="border-t border-line">
        <div className="mx-auto max-w-shell px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow">Live index</p>
                <h2 id="ecosystem" className="display mt-3 text-display-md text-ink">
                  The {EXPECTED_CHAIN.name} agent ecosystem
                </h2>
              </div>
              <p className="max-w-sm text-xs leading-6 text-ink-muted">
                Counted from KATTEGAT&rsquo;s own index. No performance, volume or success-rate
                figures appear here — ERC-8004 exposes none, and we will not invent them.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="mt-10">
              <EcosystemStats />
            </div>
          </Reveal>

          <Reveal delay={200}>
            <div className="mt-6 max-w-2xl">
              <FeedbackCoverage />
            </div>
          </Reveal>
        </div>
      </section>

      {/* -------------------------------- pillars ------------------------------ */}
      {/*
       * The anchor id lives on the section so `#how-it-works` scrolls to the top of it;
       * the heading carries its own id for `aria-labelledby`. These were previously the
       * same id on both elements, which is invalid HTML and made the label ambiguous.
       */}
      <section id="how-it-works" aria-labelledby="how-it-works-heading" className="border-t border-line">
        <div className="mx-auto max-w-shell px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <Reveal>
            <div className="max-w-3xl">
              <p className="eyebrow">Why trust KATTEGAT</p>
              <h2 id="how-it-works-heading" className="display mt-3 text-display-lg text-ink">
                Evidence, not marketing
              </h2>
              <p className="mt-5 max-w-reading text-sm leading-7 text-ink-muted">
                A marketplace that ranks agents you might trust with money has to show its working.
                These four commitments are how KATTEGAT does that — each one is a property of the
                product, not a promise.
              </p>
            </div>
          </Reveal>

          {/*
           * An open editorial grid divided by hairlines rather than four rounded cards.
           * The rules do the containing, which keeps the reading rhythm and stops the
           * section looking like a dashboard.
           */}
          <div className="mt-14 grid gap-y-12 sm:grid-cols-2 sm:gap-x-14 lg:gap-x-20">
            {PILLARS.map((pillar, index) => (
              <Reveal key={pillar.title} delay={index * 80}>
                <div className="border-t border-line pt-6">
                  <div className="flex items-center gap-3">
                    <pillar.icon className="size-4 shrink-0 text-amber" aria-hidden="true" />
                    <h3 className="text-sm font-semibold tracking-tight text-ink">
                      {pillar.title}
                    </h3>
                  </div>
                  <p className="mt-3 text-xs leading-6 text-ink-muted">{pillar.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------- journey ------------------------------ */}
      <section aria-labelledby="journey" className="relative isolate overflow-hidden border-t border-line">
        {/* A quiet echo of the hero light, so the page closes where it opened. */}
        <div
          className="fog pointer-events-none absolute inset-0 opacity-40"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-shell px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <Reveal>
            <div className="max-w-3xl">
              <p className="eyebrow">The path to a hire</p>
              <h2 id="journey" className="display mt-3 text-display-lg text-ink">
                Discover. Verify. <em>Trust.</em> Hire.
              </h2>
            </div>
          </Reveal>

          {/*
           * Numbered as a route rather than five cards. On desktop the steps read as a
           * single line across the page, divided by hairlines — a passage, not a set of
           * tiles.
           */}
          <ol className="mt-14 grid gap-y-10 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-5 lg:gap-x-8">
            {JOURNEY.map((item, index) => (
              <Reveal as="li" key={item.step} delay={index * 70}>
                <div className="border-t border-line pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5">
                  <span className="tabular font-mono text-3xs text-amber-dim">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="display mt-2 text-lg text-ink">{item.step}</h3>
                  <p className="mt-2 text-xs leading-5 text-ink-muted">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>

          {/*
           * Closing action. A single luminous seam above it — the waterline motif from
           * the hero — instead of another bordered panel.
           */}
          <Reveal delay={200}>
            <div className="horizon mt-20 flex flex-wrap items-end justify-between gap-6 pb-1">
              <div className="min-w-0">
                <h3 className="display text-display-sm text-ink">Start with the work</h3>
                <p className="mt-2 max-w-md text-xs leading-6 text-ink-muted">
                  Search the index by capability, then inspect the evidence behind any agent
                  before you commit anything to it.
                </p>
              </div>
              <Link
                href="/discover"
                className="group mb-4 inline-flex h-12 shrink-0 items-center gap-2.5 rounded-control bg-amber px-6 text-sm font-semibold text-amber-ink shadow-pop transition-colors duration-200 hover:bg-amber-bright"
              >
                Explore the harbour
                <ArrowRight
                  className="size-4 transition-transform duration-300 ease-fjord group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
