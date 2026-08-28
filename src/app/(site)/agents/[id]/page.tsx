import { AgentDetailView } from '@/features/agents/agent-detail-view';

/**
 * Agent detail route.
 *
 * A server component only to unwrap the params promise; fetching happens in the client
 * view so it shares the TanStack Query cache with the discovery grid — a card the user
 * just clicked renders from cache instead of refetching.
 */
export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-[85rem] px-4 py-8 sm:px-6 lg:px-8">
      <AgentDetailView id={decodeURIComponent(id)} />
    </div>
  );
}
