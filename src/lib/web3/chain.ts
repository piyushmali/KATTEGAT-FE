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
