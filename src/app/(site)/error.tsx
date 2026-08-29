'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/states';

/**
 * Error boundary for every page in the site tree.
 *
 * A route-level boundary rather than a global one: a failed page keeps the header,
 * navigation and wallet state instead of replacing the whole document.
 *
 * The digest is surfaced deliberately — it is the only handle a user has on a
 * server-side failure whose details are intentionally not sent to them.
 */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client-side failures never reach the server log otherwise.
    console.error('Unhandled error in site tree:', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-24 sm:px-6">
      <ErrorState
        title="This page failed to load"
        detail="An unexpected error stopped this page from rendering. Retrying often clears it."
        requestId={error.digest ?? null}
      />
      <div className="mt-6 flex justify-center">
        <Button variant="secondary" size="sm" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
