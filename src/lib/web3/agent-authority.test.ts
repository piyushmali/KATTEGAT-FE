import { beforeEach, describe, expect, it } from 'vitest';
import { loadAuthority, requiredGrantWei } from './agent-authority';

const STORAGE_KEY = 'kattegat.agent-authority.passkey';

/**
 * Guards the sizing of the pre-grant balance check.
 *
 * This arithmetic is the whole reason the hire flow can report a funding problem instead of the
 * Altana relay's empty revert (`Reason: 0x`), and it is wrong in the expensive direction if it
 * counts one registration fee where the batch charges two. The fee below is the value read from
 * the testnet KeyStore controller while diagnosing that failure.
 */
const FEE = 663_781_487_197_288n; // ~0.000664 BNB
const HEADROOM = 300_000_000_000_000n; // 0.0003 BNB, must track GAS_HEADROOM_WEI

describe('requiredGrantWei', () => {
  it('charges two registration fees for a wallet with nothing in KeyStore', () => {
    // First admin action carries initialRegisterKey(admin) as well as registerKey(session).
    expect(requiredGrantWei(FEE, 0)).toBe(FEE * 2n + HEADROOM);
  });

  it('charges one registration fee once the admin key is already registered', () => {
    expect(requiredGrantWei(FEE, 1)).toBe(FEE + HEADROOM);
    expect(requiredGrantWei(FEE, 5)).toBe(FEE + HEADROOM);
  });

  it('stays under what the sponsor sends, so a sponsored wallet is never blocked', () => {
    // Backend default AGENT_GAS_SPONSOR_AMOUNT_WEI. If this ever inverts, every first-time hire
    // is refused by our own check instead of succeeding.
    const sponsored = 5_000_000_000_000_000n;
    expect(requiredGrantWei(FEE, 0)).toBeLessThan(sponsored);
  });

  it('stays above the most expensive grant actually observed on testnet', () => {
    // Measured over repeated grants: 0.00014, 0.00146, 0.00076 BNB. A threshold below the peak
    // would let the relay reject the batch, which is the dead end this check replaces.
    const observedPeak = 1_455_466_127_937_204n;
    expect(requiredGrantWei(FEE, 0)).toBeGreaterThan(observedPeak);
  });
});

/**
 * The wallet address must round-trip from storage.
 *
 * This is the regression guard for the bug that made every hire fail. The address used to be
 * re-derived with `createWallet({ signer })`, which for a passkey signer mints a fresh random
 * address per call: the backend sponsored one address and the grant ran on another, and the
 * Altana relay rejected the batch with empty revert data (`Reason: 0x`) that named no cause.
 *
 * So the invariant is narrow and load-bearing: whatever address was stored is the address
 * handed back, byte for byte, on every read.
 */
describe('loadAuthority', () => {
  const credential = { id: 'cred-1', publicKey: '0x04aabb' };
  const walletAddress = '0x4CEF26af22a786F690612fE5571A50AD15D37676';

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns the stored wallet address unchanged, on every read', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ credential, walletAddress }));

    // Repeated reads must agree. Re-deriving instead of reading is what produced a new
    // address per call and stranded the sponsored gas on a wallet that never signed.
    expect(loadAuthority()?.walletAddress).toBe(walletAddress);
    expect(loadAuthority()?.walletAddress).toBe(walletAddress);
    expect(loadAuthority()?.credential).toEqual(credential);
  });

  it('discards a legacy entry that stored only the credential', () => {
    // Pre-fix shape: no address, because it was recomputed. Such an entry cannot name the
    // wallet it controls, so keeping it would resurrect the same silent failure.
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(credential));

    expect(loadAuthority()).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('discards an entry with no usable address', () => {
    for (const bad of [{ credential }, { credential, walletAddress: 'nope' }, { walletAddress }]) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bad));
      expect(loadAuthority()).toBeNull();
    }
  });

  it('clears a corrupt entry rather than throwing', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json');

    expect(loadAuthority()).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
