'use client';

import type { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from '../lib/web3/wagmi';
import { QueryProvider } from './query-provider';

/**
 * Single client-side provider tree.
 *
 * Order matters: wagmi depends on a TanStack Query client being available, so
 * QueryProvider sits inside WagmiProvider and both share one client rather than
 * each creating its own.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryProvider>{children}</QueryProvider>
    </WagmiProvider>
  );
}
