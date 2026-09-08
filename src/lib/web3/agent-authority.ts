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
import { createPublicClient, formatEther, http, type Hex } from 'viem';

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
 * The stored authority: a credential AND the wallet address it controls.
 *
 * The address has to be persisted rather than recomputed, and that is the whole fix for hires
 * that failed with the Altana relay's `Reason: 0x`.
 *
 * `createWallet({ signer })` looks like it would recover the address, and for a private-key
 * signer it does. For a passkey it does not: `registerAccount` generates a *fresh throwaway
 * EOA* per call and returns its address as the wallet address, so two calls with one credential
 * yield two unrelated wallets. Verified — three calls, three addresses.
 *
 * That is why hiring could never work. `openAuthority` created one address and the backend
 * sponsored it; `grantAuthority` called `createWallet` again and granted on a different,
 * empty address, so the relay rejected the batch for insufficient value and reported nothing
 * but `0x`. Raising the sponsorship could not fix it, because the funds were never landing on
 * the wallet that signed.
 *
 * The address written into the passkey's `userHandle` by `createPasskeyWallet` is the real,
 * stable identity — it is what `recoverFromPasskey` reads back. So it is captured once at
 * creation and carried from here on.
 */
interface StoredAuthority {
  credential: PasskeyCredential;
  walletAddress: `0x${string}`;
}

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
export function loadAuthority(): StoredAuthority | null {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAuthority> & { id?: unknown };

    /*
     * Entries written before the address was stored are unusable, and silently so: they hold a
     * credential whose wallet address was a per-call random value that was never recorded. The
     * only honest move is to drop them and let the user create authority that works. Nothing is
     * lost that was ever usable — a grant from such an entry could not have succeeded.
     */
    if (
      typeof parsed.walletAddress !== 'string' ||
      !parsed.walletAddress.startsWith('0x') ||
      parsed.credential === undefined
    ) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return { credential: parsed.credential, walletAddress: parsed.walletAddress };
  } catch {
    /*
     * Corrupt entry. Cleared rather than thrown, because the recovery is to make a new
     * passkey and a hard failure here would leave the user unable to reach that path.
     */
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function saveAuthority(authority: StoredAuthority): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(authority));
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
  const stored = loadAuthority();

  /*
   * Returned as stored, with no call to `createWallet`. The stored address IS the wallet; asking
   * the SDK to re-derive it from a passkey signer mints a new random one instead (see
   * StoredAuthority), which is what broke every hire.
   */
  if (stored !== null) return stored;

  const client = createClient({ chains: [networkFor(networkName)] });
  const created = await client.createPasskeyWallet({ name: 'KATTEGAT agent authority' });
  const authority = {
    walletAddress: created.address,
    credential: created.signer.credential,
  };
  saveAuthority(authority);
  return authority;
}

/** Reopens a wallet from the OS keychain when this browser has no stored credential. */
export async function recoverAuthority(networkName: string): Promise<AuthorityHandle> {
  const client = createClient({ chains: [networkFor(networkName)] });
  const recovered = await client.recoverFromPasskey();
  const authority = {
    walletAddress: recovered.address,
    credential: recovered.signer.credential,
  };
  saveAuthority(authority);
  return authority;
}

/* --------------------------- affording the batch -------------------------- */

const CONTROLLER_FEE_ABI = [
  {
    name: 'getRegistrationFeeInWei',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const;

const KEYSTORE_GET_KEYS_ABI = [
  {
    name: 'getKeys',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'bytes32[]' }],
  },
] as const;

/**
 * Execution gas for the grant batch, on top of the KeyStore fees.
 *
 * Measured over repeated grants on BSC testnet: total cost landed between 0.00014 and
 * 0.00146 BNB, and the portion that is not registration fee never exceeded ~0.0003.
 */
const GAS_HEADROOM_WEI = 300_000_000_000_000n; // 0.0003 BNB

/**
 * What the grant batch can cost, given the current fee and the wallet's KeyStore state.
 *
 * Separated from the reads so the sizing — the part that can be wrong by a factor of two — is
 * checkable without a chain. A wallet with no KeyStore entry pays two registration fees, not
 * one, because `submitCalls` prepends `initialRegisterKey(admin)` to a wallet's first admin
 * action alongside the `registerKey(session)` that `grantSession` already adds.
 */
export function requiredGrantWei(registrationFeeWei: bigint, registeredKeyCount: number): bigint {
  const registrations = registeredKeyCount === 0 ? 2n : 1n;
  return registrationFeeWei * registrations + GAS_HEADROOM_WEI;
}

/**
 * Refuses a grant the wallet cannot pay for, before the biometric and before the relay.
 *
 * WHY THIS EXISTS
 *
 * `grantSession` sends a batch whose calls carry the KeyStore registration fee as `value`.
 * When the wallet cannot cover it the Altana relay rejects the whole batch during simulation
 * and returns empty revert data, which viem surfaces as:
 *
 *     RpcExecutionError: An error occurred while executing calls.
 *     Reason: 0x
 *     Details: 0x
 *
 * That message names no cause, so a user hitting it has nothing to act on and no reason not to
 * press the button again. It cost this project two misdiagnoses. Checking the balance here
 * turns an unreadable relay revert into a sentence with a number in it.
 *
 * Deliberately sized for the worst case the batch can charge rather than the typical one: a
 * wallet with nothing in KeyStore pays two fees, because `submitCalls` prepends
 * `initialRegisterKey(admin)` to the first admin action alongside `registerKey(session)`.
 *
 * ponytail: a fixed gas headroom rather than an eth_estimateGas against the relay's own
 * pricing, so a wallet holding slightly less than this is told to top up even though it might
 * have squeezed through. That is the safe direction to be wrong in — the alternative is the
 * `Reason: 0x` dead end. Upgrade path is asking the relay to price the intent, which needs a
 * prepared batch and therefore the biometric this check exists to happen before.
 */
async function assertCanPayForGrant(
  config: NetworkConfig,
  walletAddress: `0x${string}`,
): Promise<void> {
  const publicClient = createPublicClient({
    chain: config.chain,
    transport: http(config.publicRpcUrl),
  });

  const [fee, registeredKeys] = await Promise.all([
    publicClient.readContract({
      address: config.keyStoreController,
      abi: CONTROLLER_FEE_ABI,
      functionName: 'getRegistrationFeeInWei',
    }),
    publicClient.readContract({
      address: config.keyStore,
      abi: KEYSTORE_GET_KEYS_ABI,
      functionName: 'getKeys',
      args: [walletAddress],
    }),
  ]);

  const required = requiredGrantWei(fee, registeredKeys.length);

  /*
   * Polled rather than read once. The backend waits for its funding transfer to confirm, but
   * BSC's public endpoints serve stale reads for several seconds afterwards — the SDK documents
   * the same lag around `grantSession`. Failing a wallet that was funded a moment ago would
   * reintroduce the race this check is meant to close.
   */
  let balance = 0n;
  const deadline = Date.now() + 15_000;
  for (;;) {
    balance = await publicClient.getBalance({ address: walletAddress });
    if (balance >= required || Date.now() >= deadline) break;
    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }

  if (balance < required) {
    const symbol = config.chain.nativeCurrency.symbol;
    throw new Error(
      `This wallet needs about ${formatEther(required)} ${symbol} to grant authority and holds ` +
        `${formatEther(balance)}. Add ${symbol} to ${walletAddress} and try again.`,
    );
  }
}

export interface GrantInput {
  networkName: string;
  credential: PasskeyCredential;
  /** The wallet this credential controls. Carried, never re-derived. See StoredAuthority. */
  walletAddress: `0x${string}`;
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
  const wallet = { address: input.walletAddress };

  await assertCanPayForGrant(config, wallet.address);

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
  /** Carried, never re-derived: a re-derived address revokes on a wallet that holds nothing. */
  walletAddress: `0x${string}`;
  publicKey: Hex;
}): Promise<{ transactionHash: Hex | null }> {
  const client = createClient({ chains: [networkFor(input.networkName)] });
  const signer = signerFromPasskey(input.credential);
  const wallet = { address: input.walletAddress };

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
  /** Carried, never re-derived. See StoredAuthority. */
  walletAddress: `0x${string}`;
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
  const wallet = { address: input.walletAddress };

  await assertCanPayForGrant(config, wallet.address);

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

  const publicClient = createPublicClient({
    chain: config.chain,
    transport: http(config.publicRpcUrl),
  });

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
      {
        name: 'jobCounter',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'uint256' }],
      },
    ] as const,
    functionName: 'jobCounter',
  });

  const jobId = counter + 1n;

  /*
   * Must clear the dispute window, or the provider could never submit in time and the job would
   * only ever expire. The extra half hour is slack for the batch to land.
   */
  const expiredAt = BigInt(
    Math.floor(Date.now() / 1000) + input.escrow.disputeWindowSeconds + 1800,
  );

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
  const publicClient = createPublicClient({
    chain: config.chain,
    transport: http(config.publicRpcUrl),
  });

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
