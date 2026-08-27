import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors/injected';
import { bsc } from 'wagmi/chains';
import { env } from '../../config/env';

/**
 * wagmi configuration.
 *
 * BNB Smart Chain only — declaring extra chains would let a wallet connect on a
 * network the marketplace has no data for, and "wrong network" is a state worth
 * detecting rather than tolerating.
 *
 * Only the injected connector is configured. WalletConnect needs a project id and
 * a relay, which is real setup cost for no additional capability at this stage;
 * adding it later is a one-line change here.
 */
export const wagmiConfig = createConfig({
  chains: [bsc],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [bsc.id]: http(env.bscRpcUrl),
  },
  // Next renders these components on the server first.
  ssr: true,
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
