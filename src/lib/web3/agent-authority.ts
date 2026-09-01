'use client';

import {
  BNB,
  BNB_TESTNET,
  createClient,
  signerFromPasskey,
  type NetworkConfig,
  type PasskeyCredential,
} from '@altananetwork/sdk';
import type { Hex } from 'viem';

/**
 * The user's own agent authority, held in their device.
 *
 * This is the whole non-custodial claim, and it lives in the browser for a reason: the admin
 * key is a passkey in the device's secure hardware (Secure Enclave, TPM, Windows Hello), it
 * never leaves, and KATTEGAT's servers never see it. Every grant and every revocation is
 * signed here, behind a biometric prompt.
 *
 * The backend cannot do any of this. It holds one key whose only power is sending gas, and it
 * verifies what happened here against the public Keystore before recording it. If our servers
 * were compromised tomorrow, nobody's agent authority would change.
 *
 * WHY A PASSKEY AND NOT METAMASK
 *
 * Altana's `Signer` needs `signDigest`: a signature over an arbitrary 32-byte hash. That is
 * `eth_sign`, which MetaMask deprecated and disables by default as a phishing risk, and
 * `personal_sign` prefixes the message so it cannot produce one. The SDK documents
 * `signerFromInjected` and does not export it, which is the same wall from the other side.
 *
 * Altana's own docs split the two paths explicitly: private keys are "for AI agents, backend
 * scripts, and CLI tools", passkeys are "for consumer apps". KATTEGAT is a consumer app.
 */

/** Where the credential is kept between visits. Not the key: the key is in the device. */
const STORAGE_KEY = 'kattegat.agent-authority.passkey';

/**
 * Network is chosen by the backend, never here.
 *
 * The API reports which chain it verifies against, and this maps that to the SDK config, so a
 * frontend built for testnet cannot talk to a mainnet backend or the reverse. Going live is a
 * backend environment change and this follows it.
 */
export function networkFor(name: string): NetworkConfig {
  return name === 'bnb' ? BNB : BNB_TESTNET;
}

/**
 * The persisted passkey handle, if this device has one.
 *
 * `PasskeyCredential` is documented as JSON-safe precisely so an app can do this. What is
 * stored is the credential *id* and public key, which are useless without the device: an
 * attacker with this value cannot sign anything.
 */
export function loadCredential(): PasskeyCredential | null {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return null;

  try {
    return JSON.parse(raw) as PasskeyCredential;
  } catch {
    /*
     * Corrupt entry. Cleared rather than thrown, because the recovery is to make a new
     * passkey and a hard failure here would leave the user unable to reach that path.
     */
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function saveCredential(credential: PasskeyCredential): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(credential));
}

export interface AuthorityHandle {
  /** The user's Altana smart account. Same address on every chain. */
  walletAddress: `0x${string}`;
  credential: PasskeyCredential;
}

export interface GrantedSession {
  publicKey: Hex;
  walletAddress: `0x${string}`;
  expiryUnix: number;
  transactionHash: Hex | null;
}

/**
 * Creates the user's wallet, or reopens the one this device already has.
 *
 * `createPasskeyWallet` prompts for a biometric and generates the key inside the device.
 * `recoverFromPasskey` is the path back for a device that already has one, and is also what
 * makes the wallet survive clearing localStorage: the credential is discoverable from the OS
 * keychain, so losing our stored copy is inconvenient rather than fatal.
 */
export async function openAuthority(networkName: string): Promise<AuthorityHandle> {
  const client = createClient({ chains: [networkFor(networkName)] });
  const stored = loadCredential();

  if (stored !== null) {
    const signer = signerFromPasskey(stored);
    const wallet = await client.createWallet({ signer });
    return { walletAddress: wallet.address, credential: stored };
  }

  const created = await client.createPasskeyWallet({ name: 'KATTEGAT agent authority' });
  saveCredential(created.signer.credential);
  return { walletAddress: created.address, credential: created.signer.credential };
}

/** Reopens a wallet from the OS keychain when this browser has no stored credential. */
export async function recoverAuthority(networkName: string): Promise<AuthorityHandle> {
  const client = createClient({ chains: [networkFor(networkName)] });
  const recovered = await client.recoverFromPasskey();
  saveCredential(recovered.signer.credential);
  return { walletAddress: recovered.address, credential: recovered.signer.credential };
}

export interface GrantInput {
  networkName: string;
  credential: PasskeyCredential;
  /** Ceiling in wei. Enforced by the account contract, not by us. */
  spendLimitWei: bigint;
  spendPeriod: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
  durationMinutes: number;
  allowedTargets: readonly `0x${string}`[];
}

/**
 * Grants an agent scoped authority. Prompts the user's biometric.
 *
 * `register: true` writes the key into the public Keystore, which is what lets our backend
 * verify the grant instead of trusting the browser, and lets any third party check what this
 * agent may do without asking anyone.
 */
export async function grantAuthority(input: GrantInput): Promise<GrantedSession> {
  if (input.allowedTargets.length === 0) {
    /*
     * Refused here as well as at the API and in the form. An empty allowlist reads as "any
     * contract" to the account contract, so this is the difference between a scoped session and
     * blanket access, and it is worth blocking at every layer that could produce one.
     */
    throw new Error('A session must name at least one contract the agent may call.');
  }

  const config = networkFor(input.networkName);
  const client = createClient({ chains: [config] });
  const signer = signerFromPasskey(input.credential);
  const wallet = await client.createWallet({ signer });

  const expiryUnix = Math.floor(Date.now() / 1000) + input.durationMinutes * 60;

  const session = await client.grantSession({
    wallet,
    signer,
    permissions: {
      spend: [{ limit: input.spendLimitWei, period: input.spendPeriod }],
      calls: input.allowedTargets.map((to) => ({ to })),
    },
    expiry: expiryUnix,
    register: true,
  });

  return {
    publicKey: session.publicKey,
    walletAddress: wallet.address,
    expiryUnix,
    transactionHash: session.transactionHash ?? null,
  };
}

/**
 * Revokes a session. Prompts the user's biometric.
 *
 * Takes the public key alone rather than a live `Session` object, which is what makes the
 * promise real: authority you can only withdraw while the granting page is still open is not
 * revocable. This works from a stored row, on a different device, days later.
 */
export async function revokeAuthority(input: {
  networkName: string;
  credential: PasskeyCredential;
  publicKey: Hex;
}): Promise<{ transactionHash: Hex | null }> {
  const client = createClient({ chains: [networkFor(input.networkName)] });
  const signer = signerFromPasskey(input.credential);
  const wallet = await client.createWallet({ signer });

  const result = await client.revokeSession({
    wallet,
    signer,
    session: input.publicKey,
  });

  return { transactionHash: result.transactionHash ?? null };
}

/**
 * Whether this browser can hold agent authority at all.
 *
 * WebAuthn needs a secure context and a platform authenticator. Checked so the UI can explain
 * the requirement rather than failing at the biometric prompt, which is the point where a user
 * has already committed to hiring.
 */
export function supportsPasskeys(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    typeof window.PublicKeyCredential === 'function'
  );
}
