/**
 * Root 404, for URLs that match no route at all.
 *
 * Distinct from the `(site)` not-found, which handles misses inside the app shell and
 * keeps the header. This one renders directly in the root layout, so it has no
 * providers and no navigation — hence a plain anchor rather than `next/link`.
 */
export default function RootNotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="text-[0.8125rem] font-semibold tracking-[0.16em] text-ink">KATTEGAT</p>
      <p className="eyebrow mt-6">404</p>
      <h1 className="mt-2 text-lg font-semibold text-ink">Page not found</h1>
      <p className="mt-2 text-xs text-ink-muted">That route does not exist.</p>
      <a
        href="/discover"
        className="mt-6 inline-flex h-10 items-center rounded-control bg-amber px-4 text-sm font-semibold text-amber-ink transition-colors hover:bg-amber-bright"
      >
        Browse agents
      </a>
    </div>
  );
}
