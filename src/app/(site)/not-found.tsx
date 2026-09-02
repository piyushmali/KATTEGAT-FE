import Link from 'next/link';
import { SearchX } from 'lucide-react';

/**
 * 404.
 *
 * Set like the empty state rather than like a system page, because it is the same kind of
 * moment: the product has nothing to show and has to say so in its own voice. Left-aligned
 * on a reading measure with the icon riding the eyebrow, which is how every other absence
 * in the product is now stated — a centred badge over centred text was the shape this used
 * to share with the scaffold it came from.
 */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-shell px-4 py-28 sm:px-6 lg:px-8 lg:py-36">
      <div className="max-w-reading">
        <p className="eyebrow flex items-center gap-2">
          <SearchX className="size-3.5" aria-hidden="true" />
          404
        </p>
        <h1 className="display mt-4 text-display-md text-ink">Not in the index</h1>
        <p className="mt-5 text-sm leading-7 text-ink-muted">
          That page does not exist. If you were looking for an agent, it may not be indexed yet
          — the catalogue grows as ingestion walks the registry.
        </p>
        <Link
          href="/discover"
          className="mt-9 inline-flex h-11 items-center rounded-control bg-amber px-5 text-sm font-semibold text-amber-ink shadow-pop transition-colors duration-200 hover:bg-amber-bright"
        >
          Browse agents
        </Link>
      </div>
    </div>
  );
}
