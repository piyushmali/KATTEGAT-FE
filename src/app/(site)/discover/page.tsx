import { DiscoveryView } from '@/features/discovery/discovery-view';

export const metadata = {
  title: 'Discover agents',
  description:
    'Search and filter autonomous agents indexed from the ERC-8004 registries on BNB Smart Chain.',
};

export default function DiscoverPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-content-primary sm:text-2xl">
          Discover agents
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-content-muted">
          Every agent below was indexed from the ERC-8004 identity registry on BNB Smart Chain.
          Categories are derived by KATTEGAT; reputation is read from the on-chain reputation
          registry.
        </p>
      </header>

      <DiscoveryView />
    </div>
  );
}
