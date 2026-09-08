import { describe, expect, it } from 'vitest';
import { sessionTargetsFor } from './chain';
import { networkFor } from './agent-authority';

/**
 * Guards that the contracts a session is scoped to belong to the chain it settles on.
 *
 * The bug this replaces: one list of BNB mainnet addresses was offered while hiring ran on
 * testnet, so a session's allowlist named "PancakeSwap router" and authorised an address that
 * was not it — `WETH()` reverts there on testnet, and the mainnet Venus comptroller address has
 * no code on testnet at all. The allowlist is the safety claim this product makes, so it has to
 * be true on the network the grant lands on.
 */
describe('sessionTargetsFor', () => {
  it('returns mainnet addresses only for the mainnet network name', () => {
    const mainnet = sessionTargetsFor('bnb');
    expect(mainnet.map((target) => target.address)).toEqual([
      '0x10ED43C718714eb63d5aA57B78B54704E256024E', // PancakeSwap V2 router
      '0xfD36E2c2a6789Db23113685031d7F16329158384', // Venus Unitroller
    ]);
  });

  it('returns testnet addresses for the testnet network name', () => {
    const testnet = sessionTargetsFor('bnb-testnet');
    expect(testnet.map((target) => target.address)).toEqual([
      '0xD99D1c33F9fC3444f8101754aBC46c52416550D1', // PancakeSwap V2 router, testnet
      '0x94d1820b2D1c7c7452A163983Dc888CEC546b77D', // Venus Unitroller, testnet
    ]);
  });

  it('shares no address between the two networks', () => {
    // The original defect was literally one list used for both. If an address appears on both
    // sides again, at least one of them is not the contract its label claims.
    const mainnet = sessionTargetsFor('bnb').map((target) => target.address);
    const testnet = sessionTargetsFor('bnb-testnet').map((target) => target.address);

    expect(mainnet.filter((address) => testnet.includes(address))).toEqual([]);
  });

  it('defaults to testnet for anything that is not the mainnet name', () => {
    // Same shape as networkFor: unknown names must never resolve to the chain with real funds.
    for (const name of ['', 'bnb-test', 'unknown', 'BNB']) {
      expect(sessionTargetsFor(name)).toBe(sessionTargetsFor('bnb-testnet'));
    }
  });

  it('agrees with networkFor about which name means mainnet', () => {
    /*
     * The two are separate functions over the same input, and a disagreement is the bug class
     * this replaces: targets chosen for one chain while the grant settles on another.
     */
    for (const name of ['bnb', 'bnb-testnet', '', 'whatever']) {
      const isMainnetChain = networkFor(name).chain.id === 56;
      const isMainnetTargets = sessionTargetsFor(name) === sessionTargetsFor('bnb');

      expect(isMainnetTargets, `disagreement for "${name}"`).toBe(isMainnetChain);
    }
  });

  it('labels every target and explains what it is for', () => {
    for (const name of ['bnb', 'bnb-testnet']) {
      for (const target of sessionTargetsFor(name)) {
        // A hex address is not a decision a user can make; the label is the whole interface.
        expect(target.label).not.toBe('');
        expect(target.note).not.toBe('');
        expect(target.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
      }
    }
  });
});
