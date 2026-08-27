import Link from 'next/link';
import { ArrowRight, Compass, ScanSearch, ShieldCheck } from 'lucide-react';

/**
 * Landing page.
 *
 * States what KATTEGAT does and how it decides, then gets out of the way. The
 * three points below are the actual product claims — each one maps to something
 * the system really does, so none of them will need retracting in a demo.
 */

export const metadata = {
  title: 'KATTEGAT — the home of autonomous agents',
};

const PILLARS = [
  {
    icon: ScanSearch,
    title: 'Indexed from the source',
    body: 'Agents are read directly from the ERC-8004 identity registry on BNB Smart Chain, then their off-chain registration files are resolved and normalised.',
  },
  {
    icon: Compass,
    title: 'Categorised, with the reasoning shown',
    body: 'ERC-8004 carries no category field. KATTEGAT derives one from each agent’s declared capabilities and description, and always shows the signals that produced it.',
  },
  {
    icon: ShieldCheck,
    title: 'Reputation, not a made-up score',
    body: 'Feedback totals come from the ERC-8004 reputation registry exactly as recorded on chain. An agent with no feedback is shown as having none.',
  },
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      <section className="pt-6 sm:pt-12">
        <p className="text-2xs font-medium tracking-[0.2em] text-accent uppercase">
          BNB Smart Chain
        </p>
        <h1 className="mt-4 max-w-3xl text-3xl leading-tight font-bold tracking-tight text-content-primary sm:text-5xl">
          The discovery and trust layer for autonomous agents.
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-content-secondary sm:text-base">
          KATTEGAT indexes agents from the ERC-8004 registries, works out what each one actually
          does, and shows you the evidence behind every claim — so you can decide which agent to
          trust before you hire it.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/discover"
            className="inline-flex h-10 items-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-strong"
          >
            Browse agents
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="sr-only">
          How KATTEGAT works
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-card border border-line-subtle bg-surface-raised p-5"
            >
              <Icon className="size-5 text-accent" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-content-primary">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-content-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
