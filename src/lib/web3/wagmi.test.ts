import { describe, expect, it } from 'vitest';
import { wagmiConfig } from './wagmi';
import { EXPECTED_CHAIN_ID } from './chain';

/**
 * Guards the wallet-selection bug from coming back.
 *
 * A generic `injected()` connector in the config binds to `window.ethereum`, which any
 * one of several installed extensions can own — so "Connect" opened whichever wallet
 * overwrote that property last (Phantom, in practice) instead of the one the user
 * chose, and then reported "wrong network" because that wallet answers on a different
 * chain. Wallets are meant to arrive individually through EIP-6963 discovery instead.
 *
 * jsdom announces no wallets, so the connector list is legitimately empty here. That is
 * the point: anything in it means a connector was hardcoded, which is the regression.
 */

describe('wagmi config', () => {
  it('declares no hardcoded connectors, leaving wallets to EIP-6963 discovery', () => {
    expect(wagmiConfig.connectors).toHaveLength(0);
  });

  it('never binds a connector to ambient window.ethereum', () => {
    expect(wagmiConfig.connectors.map((connector) => connector.id)).not.toContain('injected');
  });

  it('configures BNB Smart Chain only, so a wrong network is detectable', () => {
    expect(wagmiConfig.chains.map((chain) => chain.id)).toEqual([EXPECTED_CHAIN_ID]);
  });
});
