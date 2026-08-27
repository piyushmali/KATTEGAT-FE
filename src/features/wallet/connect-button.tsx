'use client';

import dynamic from 'next/dynamic';

/**
 * Browser-only entry point for the wallet button.
 *
 * `ssr: false` keeps {@link WalletControl} — and therefore wagmi — out of the
 * server render. Wallet state comes from an injected provider that does not exist
 * on the server, so server-rendering it guarantees a hydration mismatch: the
 * server always renders "Connect wallet" while the client may already know the
 * wallet is connected. Excluding it is the standard treatment for wallet UI, and
 * it keeps the server bundle free of a connector stack it can never use.
 */
const WalletControl = dynamic(
  async () => {
    const mod = await import('./wallet-control');
    return mod.WalletControl;
  },
  {
    ssr: false,
    // Reserves the button's footprint so the header does not shift on load.
    loading: () => <div className="h-8 w-32" aria-hidden="true" />,
  },
);

export function ConnectButton() {
  return <WalletControl />;
}
