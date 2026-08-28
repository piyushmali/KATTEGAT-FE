import { createConfig, http } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { env } from '../../config/env';

/**
 * wagmi configuration.
 *
 * BNB Smart Chain only — declaring extra chains would let a wallet connect on a
 * network the marketplace has no data for, and "wrong network" is a state worth
 * detecting rather than tolerating.
 *
 * No `connectors` are declared on purpose. wagmi's EIP-6963 discovery
 * (`multiInjectedProviderDiscovery`, on by default) announces one connector per
 * installed wallet, each carrying its real name and icon, so the user can pick the
 * wallet they meant.
 *
 * A generic `injected()` connector used to sit here, and it was a bug: it binds to
 * whatever holds `window.ethereum`, and with several wallets installed the last
 * extension to overwrite that property wins. On a machine with both MetaMask and
 * Phantom, Phantom claims it — so "Connect" opened the wrong wallet and then reported
 * "wrong network", because Phantom's EVM provider answers on Ethereum mainnet. The
 * fallback is not worth keeping: every wallet that matters on BNB Smart Chain
 * (MetaMask, Binance Wallet, Trust, OKX, Rabby, Coinbase) announces itself over
 * EIP-6963, and losing it makes "no wallet detected" an honest, reachable state.
 *
 * WalletConnect needs a project id and a relay, which is real setup cost for no
 * additional capability at this stage; adding it later is a one-line change here.
 */
export const wagmiConfig = createConfig({
  chains: [bsc],
  transports: {
    [bsc.id]: http(env.bscRpcUrl),
  },
  // Next renders these components on the server first. This also makes wagmi defer
  // EIP-6963 connector setup to its mount hook, which is what keeps the server and
  // client's first paint agreeing on an empty connector list.
  ssr: true,
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
