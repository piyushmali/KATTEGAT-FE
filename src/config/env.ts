import { z } from 'zod';

/**
 * Frontend configuration.
 *
 * Only `NEXT_PUBLIC_*` variables exist here, and they are all readable in the
 * browser bundle — nothing secret belongs in this file. They are referenced
 * literally rather than through a loop because Next inlines `NEXT_PUBLIC_*` at
 * build time by static analysis; `process.env[someVariable]` would be replaced
 * with undefined.
 */

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.url().default('http://127.0.0.1:4000'),
  NEXT_PUBLIC_DATA_SOURCE: z.enum(['live', 'mock']).default('live'),
  NEXT_PUBLIC_BSC_RPC_URL: z.url().default('https://bsc-rpc.publicnode.com'),
  /**
   * The canonical origin, used for `metadataBase` and the social card.
   *
   * Defaults to production rather than requiring configuration, because the cost of getting
   * it wrong is silent: relative Open Graph URLs resolve against localhost and every shared
   * link renders without a card. Override it on a preview deployment if the canonical URL
   * there matters.
   */
  NEXT_PUBLIC_SITE_URL: z.url().default('https://kattegat.xyz'),
  /**
   * Which chain hiring settles on, for the footer to state on every page.
   *
   * The hiring panel already gets this from the API, which stays the source of truth for anything
   * that signs a transaction — nothing here decides behaviour. This exists only so a server-rendered
   * footer can name the network without shipping the wallet SDK to every page, and so the statement
   * survives with JavaScript disabled, which is how a reviewer may well see it.
   *
   * The cost of a second copy is that it can disagree with the backend. It defaults to the same
   * value `ALTANA_NETWORK` defaults to, so they only diverge if someone changes one and not the
   * other — and the direction that matters, a mainnet backend still described as testnet, is the
   * one to check when going live.
   */
  NEXT_PUBLIC_HIRING_NETWORK: z.enum(['bnb', 'bnb-testnet']).default('bnb-testnet'),
});

function parse() {
  const result = envSchema.safeParse({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_DATA_SOURCE: process.env.NEXT_PUBLIC_DATA_SOURCE,
    NEXT_PUBLIC_BSC_RPC_URL: process.env.NEXT_PUBLIC_BSC_RPC_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_HIRING_NETWORK: process.env.NEXT_PUBLIC_HIRING_NETWORK,
  });

  if (!result.success) {
    const report = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid frontend configuration:\n${report}`);
  }

  return result.data;
}

const parsed = parse();

export const env = {
  apiBaseUrl: parsed.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, ''),
  dataSource: parsed.NEXT_PUBLIC_DATA_SOURCE,
  bscRpcUrl: parsed.NEXT_PUBLIC_BSC_RPC_URL,
  siteUrl: parsed.NEXT_PUBLIC_SITE_URL.replace(/\/$/, ''),
  hiringNetwork: parsed.NEXT_PUBLIC_HIRING_NETWORK,
} as const;

export const isMockMode = env.dataSource === 'mock';
