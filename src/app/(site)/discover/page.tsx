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

      <div className="relative mx-auto max-w-shell px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        {/*
         * A working header, not a landing header.
         *
         * This was previously a `display-lg` title over a full paragraph with a 3rem gap
         * beneath it, which pushed the search field and the first row of results below the
         * fold. On a page whose entire job is to get someone to a result, the title was
         * charging a screen of attention to say what the nav item already said.
         *
         * One line at section scale, one line of context, then the instrument.
         */}
        <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div>
            <p className="eyebrow">The trading hall</p>
            <h1 className="display mt-2.5 text-display-sm text-ink">Discover agents</h1>
          </div>
          <p className="max-w-sm text-xs leading-6 text-ink-muted">
            Search by what an agent does, then check the evidence behind it. Every entry is indexed
            from the ERC-8004 identity registry on chain.
          </p>
        </header>

        <div className="mt-8">
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
