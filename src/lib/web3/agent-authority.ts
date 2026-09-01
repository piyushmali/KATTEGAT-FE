'use client';

import {
  BNB,
  BNB_TESTNET,
  buildHireCalls,
  createClient,
  signerFromPasskey,
  type NetworkConfig,
  type PasskeyCredential,
} from '@altananetwork/sdk';
import { createPublicClient, http, type Hex } from 'viem';

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

/* ----------------------------- escrowed hires ----------------------------- */

export interface EscrowTargets {
  commerce: `0x${string}`;
  router: `0x${string}`;
  /**
   * The policy this chain's router accepts, as reported by the API.
   *
   * Taken from the backend rather than from the SDK's own constant, because the SDK pins one
   * address per chain and the router does not always whitelist it. Binding a policy the router
   * rejects reverts, and then funding reverts too, so this is not a value to guess at.
   */
  policy: `0x${string}`;
  paymentToken: `0x${string}`;
  disputeWindowSeconds: number;
}

export interface CommissionInput {
  networkName: string;
  credential: PasskeyCredential;
  escrow: EscrowTargets;
  /** The agent's own wallet address, which is how the kernel names it as provider. */
  provider: `0x${string}`;
  task: string;
  /** Budget in raw payment-token units. Zero is valid and moves no tokens. */
  budgetRaw: bigint;
  /**
   * Native ceiling for the session, in wei.
   *
   * Needed even when the budget is zero. The relay fronts gas and charges its fee against this
   * limit, so a session granted a zero allowance fails with `ExceededSpendLimit` before any of
   * the hire's calls run: perfectly scoped and unable to act.
   */
  spendLimitWei: bigint;
  durationMinutes: number;
}

export interface CommissionedJob {
  jobId: number;
  transactionHash: Hex | null;
  /** The session that signed it, so the caller can record and later revoke it. */
  sessionPublicKey: Hex;
  walletAddress: `0x${string}`;
  expiryUnix: number;
  expiredAtUnix: number;
}

/**
 * Commissions an escrowed ERC-8183 job. Prompts the user's biometric.
 *
 * Grants and spends in one flow rather than reusing a stored session, because `execute` needs the
 * live `Session` object and only its public key survives a page load. The user therefore approves
 * one thing: a key that may call three contracts, for a bounded time, with a bounded native
 * allowance, in order to commission this specific job.
 *
 * The five calls are the SDK's own `buildHireCalls` — createJob, registerJob, setBudget, approve,
 * fund — sent as one atomic batch. If any of them reverts, none of them happened, so a
 * half-created job is not a state this can produce.
 */
export async function commissionWork(input: CommissionInput): Promise<CommissionedJob> {
  const config = networkFor(input.networkName);
  const client = createClient({ chains: [config] });
  const signer = signerFromPasskey(input.credential);
  const wallet = await client.createWallet({ signer });

  const expiryUnix = Math.floor(Date.now() / 1000) + input.durationMinutes * 60;

  const session = await client.grantSession({
    wallet,
    signer,
    permissions: {
      spend: [{ limit: input.spendLimitWei, period: 'day' }],
      /*
       * Exactly the three contracts a hire touches. Any narrower and the batch fails partway;
       * any wider and the key can do more than commission work.
       */
      calls: [
        { to: input.escrow.commerce },
        { to: input.escrow.router },
        { to: input.escrow.paymentToken },
      ],
    },
    expiry: expiryUnix,
    register: true,
  });

  const publicClient = createPublicClient({ chain: config.chain, transport: http(config.publicRpcUrl) });

  /*
   * The job id has to be predicted, because every call after `createJob` names it and they are all
   * in the same batch. Ids are 1-indexed, so the next one is the counter plus one.
   *
   * If someone else creates a job in the same block the batch reverts as a whole, which is the
   * safe way for this to fail: the SDK notes the same, and the remedy is to read the counter again
   * and retry rather than to guess wider.
   */
  const counter = await publicClient.readContract({
    address: input.escrow.commerce,
    abi: [
      { name: 'jobCounter', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
    ] as const,
    functionName: 'jobCounter',
  });

  const jobId = counter + 1n;

  /*
   * Must clear the dispute window, or the provider could never submit in time and the job would
   * only ever expire. The extra half hour is slack for the batch to land.
   */
  const expiredAt = BigInt(Math.floor(Date.now() / 1000) + input.escrow.disputeWindowSeconds + 1800);

  const calls = buildHireCalls({
    addresses: {
      commerce: input.escrow.commerce,
      router: input.escrow.router,
      policy: input.escrow.policy,
      paymentToken: input.escrow.paymentToken,
      /* Unused by `buildHireCalls`; it takes the whole address set for its own shape. */
      registry: input.escrow.commerce,
    },
    jobId,
    provider: input.provider,
    description: input.task,
    budget: input.budgetRaw,
    expiredAt,
  });

  const result = await client.execute({ session, calls });

  return {
    jobId: Number(jobId),
    transactionHash: result.transactionHash ?? null,
    sessionPublicKey: session.publicKey,
    walletAddress: wallet.address,
    expiryUnix,
    expiredAtUnix: Number(expiredAt),
  };
}

/** The payment token balance the user holds, so a paid hire is not offered without funds. */
export async function paymentTokenBalance(
  networkName: string,
  token: `0x${string}`,
  holder: `0x${string}`,
): Promise<bigint> {
  const config = networkFor(networkName);
  const publicClient = createPublicClient({ chain: config.chain, transport: http(config.publicRpcUrl) });

  return publicClient.readContract({
    address: token,
    abi: [
      {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ type: 'address' }],
        outputs: [{ type: 'uint256' }],
      },
    ] as const,
    functionName: 'balanceOf',
    args: [holder],
  });
}
