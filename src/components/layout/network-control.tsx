'use client';

import { useEffect, useRef, useState } from 'react';
import type { Connector } from 'wagmi';
import {
  useAccount,
  useConfig,
  useConnect,
  useConnectors,
  useDisconnect,
  useReconnect,
  useSwitchChain,
} from 'wagmi';
import { AlertTriangle, LogOut, Wallet } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils/cn';
import { EXPECTED_CHAIN_ID, truncateAddress } from '../../lib/web3/chain';

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
/**
 * Restores the wallet the user last chose — and only that one.
 *
 * Calling `reconnect()` with no argument looks like "restore my session" but is not
 * what it does: it walks *every* connector and connects to the first that reports an
 * authorized account. `recentConnectorId` only influences the order. So on a machine
 * with several wallets, whichever one happens to be unlocked gets silently attached,
 * regardless of what the user picked last time. That is how a Phantom session kept
 * reappearing on a BNB marketplace and then reported "wrong network" — Phantom's EVM
 * provider answers on Ethereum mainnet.
 *
 * Passing an explicit connector list stops the walk. If the remembered wallet is gone
 * or was explicitly disconnected, nothing is restored and the user is simply offered
 * the picker, which is the honest outcome.
 *
 * An explicit disconnect stays sticky without extra bookkeeping: wagmi's injected
 * connector defaults to `shimDisconnect`, so `isAuthorized()` stays false for a wallet
 * the user disconnected even though the extension itself is still unlocked.
 *
 * The failure path is swallowed on purpose. Having no session to restore is the normal
 * first-visit state, not an error — and a wallet with no unlocked account rejects the
 * account probe with a bare object rather than an Error, which Next's dev overlay would
 * otherwise surface as an unhelpful "[object Object]".
 */
function useSilentReconnect() {
  const config = useConfig();
  const connectors = useConnectors();
  const { reconnect } = useReconnect();
  const attempted = useRef(false);

  useEffect(() => {
    /*
     * EIP-6963 wallets announce themselves after mount, so an empty list means
     * discovery has not finished rather than "no wallets". Leaving the guard unset
     * lets this run again once they arrive.
     */
    if (attempted.current || connectors.length === 0) return;
    attempted.current = true;

    void (async () => {
      let rememberedId: string | null | undefined;
      try {
        rememberedId = await config.storage?.getItem('recentConnectorId');
      } catch {
        return;
      }
      if (!rememberedId) return;

      const remembered = connectors.find((connector) => connector.id === rememberedId);
      if (!remembered) return;

      reconnect(
        { connectors: [remembered] },
        {
          onError: () => {
            // Wallet locked, account revoked, or user declined. All unremarkable.
          },
        },
      );
    })();
  }, [config, connectors, reconnect]);
}

export function NetworkControl() {
  useSilentReconnect();

  const { address, isConnected, chainId, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const wrongNetwork = isConnected && chainId !== EXPECTED_CHAIN_ID;

  return (
    <div className="flex items-center gap-2">
      {/*
       * The network is only mentioned when it is a problem.
       *
       * A permanent "BNB Smart Chain" chip was pure noise: the whole product is BNB-only,
       * it says so in the hero and the footer, and a status indicator that never changes
       * teaches people to stop reading it. Now the chip appears exactly when it carries
       * information the user has to act on, which is also when the "Switch" button next to
       * it becomes relevant.
       */}
      {wrongNetwork ? (
        <div className="hidden items-center gap-2 rounded-control border border-caution/30 bg-caution-wash/15 px-2.5 py-1.5 sm:flex">
          <span className="size-1.5 shrink-0 rounded-pill bg-caution" aria-hidden="true" />
          <span className="text-2xs font-medium text-caution">Wrong network</span>
        </div>
      ) : null}

      {isConnected ? (
        <>
          {wrongNetwork ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={isSwitching}
              className="text-caution ring-caution/40"
              onClick={() => {
                // Declining the network switch is a normal user choice, not an error.
                switchChain({ chainId: EXPECTED_CHAIN_ID }, { onError: () => undefined });
              }}
            >
              <AlertTriangle className="size-3.5" aria-hidden="true" />
              {isSwitching ? 'Switching…' : 'Switch to BNB'}
            </Button>
          ) : null}

          {/*
           * Rendered whenever a wallet is attached, including on the wrong network.
           * Previously the wrong-network branch replaced this button, which left the
           * only escape route behind the very switch that was failing — a wallet that
           * cannot add BNB Smart Chain, or a wallet the user never meant to connect,
           * had no way out. Disconnecting is how you get back to the picker.
           */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              disconnect();
            }}
            title={
              connector ? `${connector.name} · ${address ?? ''} (click to disconnect)` : address
            }
            aria-label={`Disconnect ${connector?.name ?? 'wallet'} ${address ?? ''}`}
            className="group"
          >
            {/*
             * The wallet's own icon. Worth the space: the entire wrong-wallet problem
             * was invisible because the header showed an address without saying which
             * extension produced it.
             */}
            {connector ? <WalletIcon connector={connector} size="sm" /> : null}
            <span className="font-mono">{address ? truncateAddress(address, 4) : 'Connected'}</span>
            <LogOut
              className="size-3 text-ink-faint transition-colors group-hover:text-ink-secondary"
              aria-hidden="true"
            />
          </Button>
        </>
      ) : (
        <ConnectWallet />
      )}
    </div>
  );
}

/**
 * Connect, with the choice of wallet left to the user.
 *
 * Every installed wallet arrives as its own connector via EIP-6963, so the one to
 * connect is picked from that list rather than guessed. Guessing was the old bug: it
 * took `connectors[0]`, which was a generic connector bound to `window.ethereum`, and
 * on a machine with several extensions the winner of that property is arbitrary —
 * Phantom, in practice, since it overwrites it late and aggressively.
 *
 * One wallet installed means there is no choice to make, so the menu is skipped and
 * the wallet opens directly. That keeps the common case at one click.
 */
function ConnectWallet() {
  const { connect, connectors, isPending } = useConnect();
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  const only = connectors.length === 1 ? connectors[0] : undefined;

  /*
   * Failures are handled rather than thrown. Declining the prompt, or a wallet with no
   * unlocked account, rejects this — sometimes with a plain object rather than an Error,
   * which Next's overlay renders as "[object Object]". wagmi still exposes the failure
   * through `error`, so there is nothing to do here beyond keeping it handled.
   */
  const choose = (connector: Connector) => {
    setOpen(false);
    connect({ connector }, { onError: () => undefined });
  };

  // Dismissal: Escape, or a press outside. Both are what a menu is expected to do.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={container}>
      <Button
        variant="primary"
        size="sm"
        disabled={isPending}
        aria-haspopup={only ? undefined : 'menu'}
        aria-expanded={only ? undefined : open}
        onClick={() => {
          if (only) {
            choose(only);
            return;
          }
          setOpen((value) => !value);
        }}
      >
        <Wallet className="size-3.5" aria-hidden="true" />
        {isPending ? 'Connecting…' : 'Connect'}
      </Button>

      {open && !only ? (
        <div
          role="menu"
          aria-label="Choose a wallet"
          className="animate-rise absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-panel border border-line bg-surface-overlay p-1 shadow-pop"
        >
          {connectors.length > 0 ? (
            connectors.map((connector) => (
              <button
                key={connector.uid}
                type="button"
                role="menuitem"
                onClick={() => {
                  choose(connector);
                }}
                className="flex w-full items-center gap-2.5 rounded-control px-2 py-2 text-left text-xs text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
              >
                <WalletIcon connector={connector} />
                <span className="min-w-0 flex-1 truncate font-medium">{connector.name}</span>
              </button>
            ))
          ) : (
            /*
             * No wallet announced itself. Saying so, with the reason, beats a button
             * that cannot work — and beats silently connecting to nothing.
             */
            <p className="px-2 py-2.5 text-2xs leading-5 text-ink-faint">
              No wallet detected. Install a BNB Smart Chain wallet, then reload this page.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * A wallet's own icon, as supplied over EIP-6963.
 *
 * The icon is a data URI from the extension, not a remote asset, so there is nothing
 * for `next/image` to optimise and a plain `img` is the honest element. Falls back to a
 * monogram when a wallet announces no icon.
 */
function WalletIcon({ connector, size = 'md' }: { connector: Connector; size?: 'sm' | 'md' }) {
  const box = cn('shrink-0 rounded-sm', size === 'sm' ? 'size-3.5' : 'size-5');

  if (!connector.icon) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          box,
          'flex items-center justify-center bg-surface-inset text-3xs font-semibold text-ink-muted',
        )}
      >
        {connector.name.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- extension-supplied data URI; nothing to optimise.
    <img src={connector.icon} alt="" aria-hidden="true" className={box} />
  );
}
