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
            retry: (failureCount, error) => {
              // Retrying a 404 or a contract mismatch just delays the error UI.
              if (error instanceof ApiError && !error.isRetryable) return false;
              return failureCount < 2;
            },
            retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
