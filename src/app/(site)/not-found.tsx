import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-2xs font-medium tracking-[0.2em] text-content-faint uppercase">404</p>
      <h1 className="mt-3 text-xl font-semibold text-content-primary">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-content-muted">
        That route does not exist. The agent you were looking for may not be indexed yet.
      </p>
      <Link
        href="/discover"
        className="mt-6 inline-flex h-10 items-center rounded-control bg-accent px-4 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-strong"
      >
        Browse agents
      </Link>
    </div>
  );
}
