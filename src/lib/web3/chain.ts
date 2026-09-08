import { bsc } from 'wagmi/chains';

/**
 * Every chain-specific constant in the frontend, in one file.
 *
 * Addresses, the expected chain and explorer link construction live here so no
 * component ever contains a hex literal or a hardcoded bscscan URL. When
 * KATTEGAT adds a second chain, this is the file that changes.
 */

export const EXPECTED_CHAIN = bsc;
export const EXPECTED_CHAIN_ID = bsc.id;

/**
 * ERC-8004 registries. Deployed at CREATE2-deterministic addresses, so these are
 * byte-identical on every supported mainnet — only the explorer differs.
 *
 * Read-only here: the frontend never sends a transaction to these. Agent
 * discovery and reputation both come through the KATTEGAT backend, which keeps
 * RPC access, retries and caching server-side (see docs/architecture.md).
 */
export const ERC8004_ADDRESSES = {
  identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  reputationRegistry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
} as const;

/**
 * Contracts a session can be scoped to, offered by name rather than by address.
 *
 * WHY THESE ARE PER-NETWORK
 *
 * They used to be a single list of BNB mainnet addresses, shown while hiring ran on testnet.
 * Both entries were wrong there, and checkably so: `WETH()` reverts at the mainnet PancakeSwap
 * address on testnet, and the mainnet Venus comptroller address has no code on testnet at all.
 * So the panel was naming two venues and scoping sessions to something else — a session whose
 * allowlist reads "PancakeSwap router" and authorises an address that is not it.
 *
 * That is worse than a broken link. The allowlist is the safety claim this product makes, and it
 * has to be true on the chain the grant actually settles on.
 *
 * Verified on chain before being written down, rather than copied from a docs page:
 *   - routers by `factory()` and `WETH()`, which must return that chain's WBNB
 *   - comptrollers by `oracle()`
 */
export interface SessionTarget {
  label: string;
  address: `0x${string}`;
  note: string;
}

const MAINNET_TARGETS: readonly SessionTarget[] = [
  {
    label: 'PancakeSwap router',
    // V2 router. WETH() -> 0xbb4CdB9C… (WBNB), factory() -> 0xcA143Ce3…
    address: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    note: 'Swaps and liquidity. What a grid or rebalancing agent needs.',
  },
  {
    label: 'Venus comptroller',
    // Unitroller. oracle() -> 0x6592b5DE…
    address: '0xfD36E2c2a6789Db23113685031d7F16329158384',
    note: 'Lending positions. What a health-factor monitor needs.',
  },
];

const TESTNET_TARGETS: readonly SessionTarget[] = [
  {
    label: 'PancakeSwap router',
    // V2 router on testnet. WETH() -> 0xae13d989… (WBNB testnet), factory() -> 0x6725F303…
    address: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1',
    note: 'Swaps and liquidity. What a grid or rebalancing agent needs.',
  },
  {
    label: 'Venus comptroller',
    // Unitroller on testnet. oracle() -> 0x3cD69251…
    address: '0x94d1820b2D1c7c7452A163983Dc888CEC546b77D',
    note: 'Lending positions. What a health-factor monitor needs.',
  },
];

/**
 * The targets valid on the network the backend hires on.
 *
 * Mirrors `networkFor` in agent-authority.ts deliberately — same input, same `'bnb'` test, same
 * testnet default. The two must not be able to disagree, because that is exactly the bug this
 * replaces: addresses for one chain and a grant settling on another.
 */
export function sessionTargetsFor(networkName: string): readonly SessionTarget[] {
  return networkName === 'bnb' ? MAINNET_TARGETS : TESTNET_TARGETS;
}

const EXPLORER_BASE = bsc.blockExplorers.default.url.replace(/\/$/, '');

export const explorerUrl = {
  address: (address: string): string => `${EXPLORER_BASE}/address/${address}`,
  token: (contract: string, tokenId: number | string): string =>
    `${EXPLORER_BASE}/token/${contract}?a=${String(tokenId)}`,
  block: (block: number): string => `${EXPLORER_BASE}/block/${String(block)}`,
};

/** Canonical explorer link for an agent's ERC-721 identity token. */
export function agentIdentityUrl(agentId: number): string {
  return explorerUrl.token(ERC8004_ADDRESSES.identityRegistry, agentId);
}

/**
 * Shortens an address for display. Keeps enough of both ends to be verifiable
 * against a wallet or explorer at a glance.
 */
export function truncateAddress(address: string, visible = 4): string {
  if (address.length <= visible * 2 + 2) return address;
  return `${address.slice(0, visible + 2)}…${address.slice(-visible)}`;
}
