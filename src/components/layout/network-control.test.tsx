import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mock } from 'wagmi/connectors/mock';
import { bsc, mainnet } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { NetworkControl } from './network-control';

/**
 * The bug these cover: KATTEGAT kept silently attaching a wallet the user never chose.
 *
 * `reconnect()` with no argument reads as "restore my session" but walks every
 * connector and takes the first with an authorized account — `recentConnectorId` only
 * reorders the walk. On a machine with several wallets installed, whichever one happened
 * to be unlocked won, so a Solana-first wallet kept attaching itself to a BNB
 * marketplace and then reported "wrong network".
 *
 * The setup below is therefore the shape that fails: two already-approved wallets, only
 * one of them remembered, and the one the user did *not* choose listed first.
 */

const REMEMBERED = '0x1111111111111111111111111111111111111111';
const OTHER = '0x2222222222222222222222222222222222222222';

type ConnectorFn = ReturnType<typeof mock>;

/**
 * A mock wallet carrying a real-looking EIP-6963 id.
 *
 * `mock()` hardcodes `id: 'mock'`, so two of them are indistinguishable and the
 * "remembered" lookup has nothing to match on. `createConnector` is identity, so
 * overriding the id afterwards is enough.
 *
 * `defaultConnected` plus `reconnect` is what makes `isAuthorized()` report true — the
 * state of a site the wallet has already approved, which is exactly the condition that
 * made the unconstrained walk attach the wrong wallet.
 */
function wallet(id: string, account: `0x${string}`, chainId?: number): ConnectorFn {
  const base = mock({
    accounts: [account],
    features: { defaultConnected: true, reconnect: true },
  });
  return (params) => ({
    ...base(params),
    id,
    // Reports a chain the app does not configure, which is what a wallet sitting on
    // Ethereum mainnet does to a BNB-only marketplace.
    ...(chainId === undefined ? {} : { getChainId: () => Promise.resolve(chainId) }),
  });
}

function buildConfig(connectors: ConnectorFn[]) {
  return createConfig({
    chains: [bsc],
    connectors,
    transports: { [bsc.id]: http('http://127.0.0.1:8545') },
  });
}

function mount(config: ReturnType<typeof buildConfig>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <WagmiProvider config={config} reconnectOnMount={false}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
  return render(<NetworkControl />, { wrapper: Wrapper });
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('NetworkControl session restore', () => {
  it('restores the remembered wallet, not whichever one is unlocked', async () => {
    const config = buildConfig([wallet('app.phantom', OTHER), wallet('io.metamask', REMEMBERED)]);
    // wagmi records the user's choice under this key when they connect.
    await config.storage?.setItem('recentConnectorId', 'io.metamask');

    mount(config);

    await waitFor(() => {
      expect(config.state.status).toBe('connected');
    });

    const accounts = [...config.state.connections.values()].flatMap(
      (connection) => connection.accounts,
    );
    expect(accounts).toContain(REMEMBERED);
    expect(accounts).not.toContain(OTHER);
  });

  it('restores nothing when the user has never chosen a wallet', async () => {
    const config = buildConfig([wallet('app.phantom', OTHER), wallet('io.metamask', REMEMBERED)]);
    mount(config);

    // Both wallets would happily connect. Neither is the user's choice, so neither wins.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /connect/i })).toBeTruthy();
    });
    expect(config.state.status).toBe('disconnected');
  });

  it('raises no network warning, because the injected wallet governs nothing', async () => {
    /*
     * This used to assert a "Switch to BNB" button appeared for a wallet on the wrong chain.
     * That behaviour was removed, and its removal is the point of this test now.
     *
     * The injected EVM wallet is not the signer for any action in the product — reads go through
     * the backend, and the hire flow signs with a passkey on the network the backend chooses. So
     * the wallet's chain is irrelevant, and the old warning was a permanent amber alarm a user
     * could never satisfy: it fired for a Solana wallet's Ethereum-mainnet answer, and it also
     * fired for a real MetaMask sitting correctly on BNB Chain, because the app expects mainnet
     * (56) while hiring runs on testnet (97). Switching "fixed" the warning and changed nothing.
     *
     * So a wallet on any chain now simply shows as connected, with a way to disconnect, and no
     * warning and no switch button.
     */
    const config = buildConfig([wallet('io.metamask', REMEMBERED, mainnet.id)]);
    await config.storage?.setItem('recentConnectorId', 'io.metamask');

    mount(config);

    await waitFor(() => {
      expect(config.state.status).toBe('connected');
    });
    // The wallet is genuinely on a chain the app does not configure.
    const [connection] = [...config.state.connections.values()];
    expect(connection?.chainId).not.toBe(bsc.id);

    // No false alarm, and no pointless switch.
    expect(screen.queryByText(/wrong network/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /switch to bnb/i })).toBeNull();

    // Disconnect stays reachable, which is the only control the header needs to offer here.
    expect(screen.getByRole('button', { name: /disconnect/i })).toBeTruthy();
  });
});
