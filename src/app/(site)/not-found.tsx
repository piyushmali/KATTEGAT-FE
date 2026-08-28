import Link from 'next/link';
import { SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-28 text-center">
      <div className="flex size-10 items-center justify-center rounded-control bg-surface-overlay">
        <SearchX className="size-4 text-ink-faint" aria-hidden="true" />
      </div>
      <p className="eyebrow mt-5">404</p>
      <h1 className="mt-2 text-lg font-semibold text-ink">Not found</h1>
      <p className="mt-2 text-xs leading-5 text-ink-muted">
        That page does not exist. If you were looking for an agent, it may not be indexed yet — the
        catalogue grows as ingestion walks the registry.
      </p>
      <Link
        href="/discover"
        className="mt-6 inline-flex h-10 items-center rounded-control bg-amber px-4 text-sm font-semibold text-amber-ink transition-colors hover:bg-amber-bright"
      >
        Browse agents
      </Link>
    </div>
  );
}
