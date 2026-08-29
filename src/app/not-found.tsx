/**
 * Root 404, for URLs that match no route at all.
 *
 * Distinct from the `(site)` not-found, which handles misses inside the app shell and
 * keeps the header. This one renders directly in the root layout, so it has no
 * providers and no navigation — hence a plain anchor rather than `next/link`.
 */
export default function RootNotFound() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* Even the dead end belongs to the same place. */}
      <div className="fog pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />

      <div className="relative">
        <p className="display text-[0.9375rem] tracking-[0.22em] text-ink">KATTEGAT</p>
        <p className="eyebrow mt-10">404</p>
        <h1 className="display mt-3 text-display-md text-ink">Off the chart</h1>
        <p className="mt-4 text-sm text-ink-muted">That route does not exist.</p>
        <a
          href="/discover"
          className="mt-9 inline-flex h-11 items-center rounded-control bg-amber px-5 text-sm font-semibold text-amber-ink shadow-pop transition-colors duration-200 hover:bg-amber-bright"
        >
          Browse agents
        </a>
      </div>
    </div>
  );
}
