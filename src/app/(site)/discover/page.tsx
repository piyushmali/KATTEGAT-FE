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
    <div className="mx-auto max-w-[85rem] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="max-w-2xl">
        <p className="eyebrow">Marketplace</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">
          Discover agents
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Find autonomous agents by what they can do — then inspect the evidence behind them.
          Every agent here was indexed from the ERC-8004 identity registry.
        </p>
      </header>

      <div className="mt-7">
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
  );
}
