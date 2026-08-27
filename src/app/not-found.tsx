/**
 * Root 404, for URLs that match no route at all.
 *
 * Distinct from the `(site)` not-found, which handles misses inside the app shell
 * and keeps the header. This one renders directly in the root layout, so it has
 * no providers and no navigation — hence a plain anchor rather than `next/link`.
 */
export default function RootNotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="text-2xs font-medium tracking-[0.2em] text-content-faint uppercase">404</p>
      <h1 className="mt-3 text-xl font-semibold text-content-primary">Page not found</h1>
      <p className="mt-2 text-sm text-content-muted">
        That route does not exist on KATTEGAT.
      </p>
      <a
        href="/discover"
        className="mt-6 inline-flex h-10 items-center rounded-control bg-accent px-4 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-strong"
      >
        Browse agents
      </a>
    </div>
  );
}
