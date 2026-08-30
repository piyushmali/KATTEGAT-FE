import Link from 'next/link';
import { SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-32 text-center">
      <div className="flex size-11 items-center justify-center rounded-control border border-line bg-surface-overlay/60">
        <SearchX className="size-4 text-ink-faint" aria-hidden="true" />
      </div>
      <p className="eyebrow mt-6">404</p>
      <h1 className="display mt-3 text-display-sm text-ink">Not in the index</h1>
      <p className="mt-4 text-xs leading-6 text-ink-muted">
        That page does not exist. If you were looking for an agent, it may not be indexed yet. The
        catalogue grows as ingestion walks the registry.
      </p>
      <Link
        href="/discover"
        className="mt-8 inline-flex h-11 items-center rounded-control bg-amber px-5 text-sm font-semibold text-amber-ink shadow-pop transition-colors duration-200 hover:bg-amber-bright"
      >
        Browse agents
      </Link>
    </div>
  );
}
