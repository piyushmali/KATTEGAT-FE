'use client';

import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { AlertTriangle, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EXPECTED_CHAIN, EXPECTED_CHAIN_ID, truncateAddress } from '@/lib/web3/chain';

/**
 * The wallet button's actual UI, covering each state it can be in: no wallet
 * available, disconnected, connecting, connected on the wrong network, connected.
 *
 * Loaded only in the browser — see connect-button.tsx for why.
 *
 * Connecting grants no spending authority. Nothing here requests an allowance or
 * signs anything; it establishes identity only. A future hire flow must ask for
 * permissions as its own explicit, scoped step.
 */
export function WalletControl() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const injectedConnector = connectors[0];
  const onWrongNetwork = isConnected && chainId !== EXPECTED_CHAIN_ID;

  if (!isConnected) {
    if (!injectedConnector) {
      return <span className="text-xs text-content-muted">No browser wallet detected</span>;
    }

    return (
      <Button
        variant="primary"
        size="sm"
        disabled={isPending}
        onClick={() => {
          connect({ connector: injectedConnector });
        }}
      >
        <Wallet className="size-4" aria-hidden="true" />
        {isPending ? 'Connecting…' : 'Connect wallet'}
      </Button>
    );
  }

  // KATTEGAT only holds data for BNB Smart Chain, so a wallet on another network
  // is told plainly rather than shown a UI that would mean nothing.
  if (onWrongNetwork) {
    return (
      <Button
        variant="secondary"
        size="sm"
        disabled={isSwitching}
        className="text-caution ring-caution-muted"
        onClick={() => {
          switchChain({ chainId: EXPECTED_CHAIN_ID });
        }}
      >
        <AlertTriangle className="size-4" aria-hidden="true" />
        {isSwitching ? 'Switching…' : `Switch to ${EXPECTED_CHAIN.name}`}
      </Button>
    );
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => {
        disconnect();
      }}
      title={address}
      aria-label={`Disconnect wallet ${address ?? ''}`}
    >
      <span className="size-1.5 rounded-pill bg-positive" aria-hidden="true" />
      <span className="font-mono">{address ? truncateAddress(address) : 'Connected'}</span>
    </Button>
  );
}
