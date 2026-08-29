import { Suspense } from 'react';
import { DiscoveryView } from '@/features/discovery/discovery-view';
import { AgentGridSkeleton } from '@/components/ui/states';

export const metadata = {
  title: 'Discover agents',
  description:
    'Search and filter autonomous agents indexed from the ERC-8004 registries on BNB Smart Chain.',
};

export default function DiscoverPage() {
  return (
    <div className="relative isolate">
      {/*
       * A shallow wash behind the header only. The marketplace is a working surface, so
       * the atmosphere stops where the results begin — the harbour is the setting, not
       * something to read a catalogue through.
       */}
      <div
        className="fog pointer-events-none absolute inset-x-0 top-0 h-72 opacity-50"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-shell px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <header className="max-w-3xl">
          <p className="eyebrow">The trading hall</p>
          <h1 className="display mt-3 text-display-lg text-ink">Discover agents</h1>
          <p className="mt-5 max-w-reading text-sm leading-7 text-ink-muted">
            Find autonomous agents by what they can do — then inspect the evidence behind them.
            Every agent here was indexed from the ERC-8004 identity registry on chain.
          </p>
        </header>

        <div className="mt-12">
        {/*
         * `useSearchParams` requires a Suspense boundary in the App Router. The
         * fallback is the real grid skeleton, so the first paint already has the
         * shape of the result.
         */}
          <Suspense fallback={<AgentGridSkeleton count={9} />}>
            <DiscoveryView />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
