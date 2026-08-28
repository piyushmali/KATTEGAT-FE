'use client';

import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { AlertTriangle, LogOut, Wallet } from 'lucide-react';
import { Button } from '../ui/button';
import { EXPECTED_CHAIN, EXPECTED_CHAIN_ID, truncateAddress } from '../../lib/web3/chain';

/**
 * Network and wallet state, as one control.
 *
 * The network indicator is always present and reads as a status readout, not a
 * warning — KATTEGAT is a BNB Smart Chain product, so saying so is orientation
 * rather than an error. It only turns amber when the connected wallet is on the
 * wrong chain, which is a genuine problem the user can fix in one click.
 *
 * Connecting establishes identity only. Nothing here requests an allowance or signs
 * anything; scoped authority is a separate, explicit step in the hire flow.
 */
export function NetworkControl() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const injected = connectors[0];
  const wrongNetwork = isConnected && chainId !== EXPECTED_CHAIN_ID;

  return (
    <div className="flex items-center gap-2">
      {/* Network readout. Hidden on the narrowest screens where the wallet matters more. */}
      <div className="hidden items-center gap-2 rounded-control border border-line bg-surface-raised px-2.5 py-1.5 sm:flex">
        <span
          className={
            wrongNetwork
              ? 'size-1.5 shrink-0 rounded-pill bg-caution'
              : 'size-1.5 shrink-0 rounded-pill bg-positive'
          }
          aria-hidden="true"
        />
        <span className="text-2xs font-medium text-ink-secondary">
          {wrongNetwork ? 'Wrong network' : EXPECTED_CHAIN.name}
        </span>
      </div>

      {wrongNetwork ? (
        <Button
          variant="secondary"
          size="sm"
          disabled={isSwitching}
          className="text-caution ring-caution/40"
          onClick={() => {
            switchChain({ chainId: EXPECTED_CHAIN_ID });
          }}
        >
          <AlertTriangle className="size-3.5" aria-hidden="true" />
          {isSwitching ? 'Switching…' : 'Switch to BNB'}
        </Button>
      ) : isConnected ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            disconnect();
          }}
          title={address}
          aria-label={`Disconnect wallet ${address ?? ''}`}
          className="group"
        >
          <span className="font-mono">{address ? truncateAddress(address, 4) : 'Connected'}</span>
          <LogOut
            className="size-3 text-ink-faint transition-colors group-hover:text-ink-secondary"
            aria-hidden="true"
          />
        </Button>
      ) : injected ? (
        <Button
          variant="primary"
          size="sm"
          disabled={isPending}
          onClick={() => {
            connect({ connector: injected });
          }}
        >
          <Wallet className="size-3.5" aria-hidden="true" />
          {isPending ? 'Connecting…' : 'Connect'}
        </Button>
      ) : (
        // No injected provider. Stating it beats a button that cannot work.
        <span className="hidden text-2xs text-ink-faint sm:inline">No wallet detected</span>
      )}
    </div>
  );
}
