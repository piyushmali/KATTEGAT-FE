'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../lib/api/errors';

/**
 * TanStack Query setup.
 *
 * The client is created inside `useState` rather than at module scope so it is
 * never shared between requests during server rendering — a module-level client
 * would leak one user's cache into another's response.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Agent data changes at ingestion cadence, not per second.
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            /*
             * One retry, not two, because the per-request budget is now 75 seconds.
             *
             * That budget exists to survive a cold start on a free host that sleeps after 15
             * minutes and takes 50 seconds or more to wake. Once a single attempt can absorb
             * that, further attempts stop being resilience and become a way to make a real
             * outage take four minutes to report: three attempts at 75 seconds is worse for
             * the user than one honest failure.
             */
            retry: (failureCount, error) => {
              // Retrying a 404 or a contract mismatch just delays the error UI.
              if (error instanceof ApiError && !error.isRetryable) return false;
              return failureCount < 1;
            },
            retryDelay: () => 1_500,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
