'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import type { SpendPeriod } from '../../lib/api/contract';
import {
  grantAuthority,
  loadCredential,
  openAuthority,
  revokeAuthority,
} from '../../lib/web3/agent-authority';

/**
 * Hiring an agent, and taking the authority back.
 *
 * Both mutations do their real work in the browser: the user's passkey signs the grant and the
 * revocation, and the API call afterwards only reports what the chain already accepted. So the
 * order inside each mutation is load-bearing. Chain first, then tell the backend. Reversed, our
 * database would claim authority that does not exist.
 *
 * Neither is optimistic. Each is a transaction that takes seconds and can fail, and what is
 * being reported is whether an agent holds authority over money. Showing "revoked" before the
 * chain confirms would tell someone they are safe while the agent can still act.
 */

export const hiringKeys = {
  sessions: (agentId: string) => ['hiring', 'sessions', agentId] as const,
};

export function useAgentSessions(agentId: string) {
  return useQuery({
    queryKey: hiringKeys.sessions(agentId),
    queryFn: ({ signal }) => api.listAgentSessions(agentId, signal),
    /*
     * Polled, because a session expires against a wall clock rather than an event, and because
     * the backend reads status from the Keystore: a revocation performed in another app shows up
     * on the next poll without the user doing anything here.
     */
    refetchInterval: 30_000,
  });
}

export interface HireInput {
  networkName: string;
  spendLimitWei: string;
  spendPeriod: SpendPeriod;
  durationMinutes: number;
  allowedTargets: string[];
  /** Whether the backend offers to cover the first grant's gas. */
  gasSponsored: boolean;
}

export function useHireAgent(agentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: HireInput) => {
      /*
       * 1. Open the user's own wallet. Creates a passkey on first use, which is the biometric
       *    prompt they see; reuses the device's credential afterwards.
       */
      const authority = await openAuthority(input.networkName);

      /*
       * 2. Ask for gas before granting, not after. A grant is a transaction, so an unfunded
       *    wallet fails at the point where the user has already approved with their biometric,
       *    which is the worst place to discover a balance problem. Failure here is tolerated:
       *    the user may already have funds, and the grant is what actually matters.
       */
      if (input.gasSponsored) {
        try {
          await api.sponsorGas(agentId, authority.walletAddress);
        } catch {
          // Sponsorship is a convenience. If it is unavailable the grant may still succeed.
        }
      }

      // 3. The grant itself, signed by the passkey in the user's device.
      const granted = await grantAuthority({
        networkName: input.networkName,
        credential: authority.credential,
        spendLimitWei: BigInt(input.spendLimitWei),
        spendPeriod: input.spendPeriod,
        durationMinutes: input.durationMinutes,
        allowedTargets: input.allowedTargets as `0x${string}`[],
      });

      /*
       * 4. Report it. The backend verifies against the public Keystore before storing, so this
       *    cannot fabricate authority even though the client is the one reporting.
       */
      return api.recordSession(agentId, {
        walletAddress: granted.walletAddress,
        publicKey: granted.publicKey,
        spendLimitWei: input.spendLimitWei,
        spendPeriod: input.spendPeriod,
        allowedTargets: input.allowedTargets,
        expiresAtUnix: granted.expiryUnix,
        grantedTxHash: granted.transactionHash,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hiringKeys.sessions(agentId) });
    },
  });
}

export function useRevokeAgent(agentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      publicKey,
      networkName,
    }: {
      publicKey: string;
      networkName: string;
    }) => {
      const credential = loadCredential();
      if (credential === null) {
        /*
         * The credential lives in this browser's storage. Without it we cannot sign a
         * revocation, and saying so is better than a cryptic SDK error: the user's authority is
         * intact and recoverable from their device keychain.
         */
        throw new Error(
          'This browser has no agent authority stored. Reopen it on the device you granted from.',
        );
      }

      // Chain first. The backend refuses to record a revocation the Keystore has not seen.
      await revokeAuthority({
        networkName,
        credential,
        publicKey: publicKey as `0x${string}`,
      });

      return api.confirmRevoked(publicKey);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hiringKeys.sessions(agentId) });
    },
  });
}
