import { describe, expect, it } from 'vitest';
import { readsAsRequest, shouldInterpret } from './reads-as-request';

/**
 * This decides which of two search backends a query reaches, and getting it wrong is
 * visible to the user in both directions — an unwanted explanation for a keyword, or an
 * empty grid for a reasonable sentence. The cases below are the real queries the
 * backend's own intent engine was built against.
 */

describe('readsAsRequest — sends sentences to intent parsing', () => {
  it.each([
    'rebalance my portfolio',
    'conservative yield agent with a track record',
    'audit a smart contract',
    'I need something to watch my health factor',
    'find me the best trading agent',
    'what can monitor gas for me',
  ])('claims %o', (query) => {
    expect(readsAsRequest(query)).toBe(true);
  });
});

describe('readsAsRequest — leaves keywords to substring matching', () => {
  it.each([
    'rebalance',
    'yield',
    'grid trading',
    'grid trading bot',
    'smart contract',
    '0xinsig',
    'termix-batve.agent',
  ])('does not claim %o', (query) => {
    /*
     * These are names and terms a user already knows they want. A substring match
     * against descriptions is both faster and more predictable than asking an intent
     * engine to reinterpret them.
     */
    expect(readsAsRequest(query)).toBe(false);
  });
});

describe('readsAsRequest — edge cases', () => {
  it('treats empty and whitespace-only input as not a request', () => {
    expect(readsAsRequest('')).toBe(false);
    expect(readsAsRequest('   ')).toBe(false);
  });

  it('ignores punctuation when counting words', () => {
    // Three words plus a comma must not be inflated into four.
    expect(readsAsRequest('grid, trading bot')).toBe(false);
  });

  it('claims a two-word query only when one word belongs to a request', () => {
    expect(readsAsRequest('my portfolio')).toBe(true);
    expect(readsAsRequest('portfolio rebalancer')).toBe(false);
  });

  it('is not fooled by repeated whitespace', () => {
    expect(readsAsRequest('yield    optimiser')).toBe(false);
  });
});

describe('shouldInterpret — an explicit filter always wins', () => {
  const sentence = 'conservative yield agent with a track record';
  const base = {
    q: sentence,
    category: null as string | null,
    protocol: null as string | null,
    traits: [] as string[],
    resolvedOnly: false,
  };

  it('interprets a sentence when the user has set no filters', () => {
    expect(shouldInterpret(base)).toBe(true);
  });

  /*
   * Each of these is a choice the user made by hand. The interpreter derives its own
   * category, protocol and traits, so letting it run would silently replace that choice
   * with something else and give no indication it had happened.
   */
  it('defers to a hand-picked category', () => {
    expect(shouldInterpret({ ...base, category: 'security-verification' })).toBe(false);
  });

  it('defers to a hand-picked protocol', () => {
    expect(shouldInterpret({ ...base, protocol: 'a2a' })).toBe(false);
  });

  it('defers to hand-picked traits', () => {
    expect(shouldInterpret({ ...base, traits: ['tee-attested'] })).toBe(false);
  });

  it('defers to the resolved-metadata filter', () => {
    expect(shouldInterpret({ ...base, resolvedOnly: true })).toBe(false);
  });

  it('still declines a keyword even with no filters set', () => {
    expect(shouldInterpret({ ...base, q: 'grid trading' })).toBe(false);
  });
});
