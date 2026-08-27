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
});

function parse() {
  const result = envSchema.safeParse({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_DATA_SOURCE: process.env.NEXT_PUBLIC_DATA_SOURCE,
    NEXT_PUBLIC_BSC_RPC_URL: process.env.NEXT_PUBLIC_BSC_RPC_URL,
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
} as const;

export const isMockMode = env.dataSource === 'mock';
