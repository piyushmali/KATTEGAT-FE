'use client';

import type { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from '../lib/web3/wagmi';
import { installProviderRejectionGuard } from '../lib/web3/provider-rejections';
import { QueryProvider } from './query-provider';

/*
 * Installed at module scope rather than in an effect, because it has to be listening
 * before wagmi's `hydrate` mount hook runs `connector.setup()` on every wallet EIP-6963
 * discovered. An effect would attach too late to catch that first wave.
 *
 * Guarded for the browser inside the function, so importing this on the server is inert.
 */
installProviderRejectionGuard();

/**
 * Single client-side provider tree.
 *
 * Order matters: wagmi depends on a TanStack Query client being available, so
 * QueryProvider sits inside WagmiProvider and both share one client rather than
 * each creating its own.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    /*
     * `reconnectOnMount={false}` on purpose.
     *
     * With it enabled, wagmi probes every injected provider for accounts as soon as the
     * app mounts, and a wallet extension that has no unlocked account can reject that
     * probe with a bare object rather than an Error. wagmi does not own that promise, so
     * the rejection escapes as an unhandled rejection — observed in the wild with the
     * HashPack extension rejecting `{ code: 4001, message: 'wallet must has at least
     * one account' }`, which surfaces in Next's dev overlay as an unhelpful
     * "[object Object]".
     *
     * Session restoration still happens, but explicitly and with a catch — see
     * `useSilentReconnect` in components/layout/network-control.tsx.
     */
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      <QueryProvider>{children}</QueryProvider>
    </WagmiProvider>
  );
}
