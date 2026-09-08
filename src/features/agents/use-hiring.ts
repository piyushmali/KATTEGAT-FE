'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import type { EscrowContext, SpendPeriod } from '../../lib/api/contract';
import {
  commissionWork,
  grantAuthority,
  loadAuthority,
  openAuthority,
  revokeAuthority,
} from '../../lib/web3/agent-authority';
import { agentKeys } from '../discovery/use-agents';

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
        } catch (error) {
          /*
           * Still tolerated: the user may already hold enough, and `grantAuthority` checks the
           * balance before it prompts, so an unaffordable grant now fails with the amount it
           * needed rather than an empty relay revert.
           *
           * Logged rather than dropped. Swallowing this silently is what made the failure
           * undiagnosable: every funding problem arrived as "an error occurred while executing
           * calls" from the relay, with the actual cause discarded here.
           */
          console.error('[kattegat] gas sponsorship failed; continuing to the grant', error);
        }
      }

      // 3. The grant itself, signed by the passkey in the user's device.
      const granted = await grantAuthority({
        networkName: input.networkName,
        credential: authority.credential,
        walletAddress: authority.walletAddress,
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
    // The panel shows the error's own message; this keeps the full object, including any SDK
    // cause chain and stack, reachable in the console for diagnosis.
    onError: (error) => {
      console.error('[kattegat] hire failed', error);
    },
  });
}

export function useRevokeAgent(agentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ publicKey, networkName }: { publicKey: string; networkName: string }) => {
      const stored = loadAuthority();
      if (stored === null) {
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
        credential: stored.credential,
        walletAddress: stored.walletAddress,
        publicKey: publicKey as `0x${string}`,
      });

      return api.confirmRevoked(publicKey);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hiringKeys.sessions(agentId) });
    },
    onError: (error) => {
      console.error('[kattegat] revoke failed', error);
    },
  });
}

export interface CommissionInput {
  networkName: string;
  escrow: EscrowContext;
  /** The agent's own wallet address, which is how the kernel names it as provider. */
  providerAddress: `0x${string}`;
  task: string;
  /** Raw payment-token units. Zero is a valid job that moves no tokens. */
  budgetRaw: string;
  /** Native ceiling for the session, covering the relay's fee. */
  spendLimitWei: string;
  durationMinutes: number;
  gasSponsored: boolean;
}

/**
 * Commissions escrowed work, then reports it.
 *
 * Same order as granting authority, and load-bearing for the same reason: the chain first, then
 * the backend. Reversed, our database would claim a funded job that does not exist.
 *
 * The backend cannot do the first half. Funding escrow spends the user's own tokens, so the batch
 * is signed by a session key the user's passkey just authorised, in their browser. What comes back
 * here is a job id, and the backend goes and reads the kernel to see whether it says what we say
 * it does.
 */
export function useCommissionWork(agentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CommissionInput) => {
      if (!input.escrow.available) {
        /*
         * Refused before any prompt. No whitelisted policy on this chain means `registerJob`
         * reverts and funding reverts after it, so the biometric would be asked for a transaction
         * that cannot succeed.
         */
        throw new Error('Escrow hiring is unavailable on this network right now.');
      }

      const authority = await openAuthority(input.networkName);

      /*
       * Gas before the prompt, for the same reason as a grant: this is a transaction, and
       * discovering an empty wallet after the user has approved with a biometric is the worst
       * place to find out. Tolerated on failure, since they may already hold enough.
       */
      if (input.gasSponsored) {
        try {
          await api.sponsorGas(agentId, authority.walletAddress);
        } catch (error) {
          // Tolerated for the same reason as a grant, and logged for the same reason.
          console.error('[kattegat] gas sponsorship failed; continuing to the hire', error);
        }
      }

      const job = await commissionWork({
        networkName: input.networkName,
        credential: authority.credential,
        walletAddress: authority.walletAddress,
        escrow: {
          commerce: input.escrow.commerce,
          router: input.escrow.router,
          policy: input.escrow.policy,
          paymentToken: input.escrow.paymentToken,
          disputeWindowSeconds: input.escrow.disputeWindowSeconds,
        },
        provider: input.providerAddress,
        task: input.task,
        budgetRaw: BigInt(input.budgetRaw),
        spendLimitWei: BigInt(input.spendLimitWei),
        durationMinutes: input.durationMinutes,
      });

      /*
       * Record the session as well as the job. The key that signed this hire holds authority until
       * it expires, so leaving it unrecorded would mean the user could not see or revoke it, which
       * is the one thing this product promises about agent authority.
       */
      await api.recordSession(agentId, {
        walletAddress: job.walletAddress,
        publicKey: job.sessionPublicKey,
        spendLimitWei: input.spendLimitWei,
        spendPeriod: 'day',
        allowedTargets: input.escrow.allowedTargets,
        expiresAtUnix: job.expiryUnix,
        grantedTxHash: null,
      });

      return api.recordAgentJob(agentId, job.jobId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: hiringKeys.sessions(agentId) }),
        /* The escrow panel reads this, and a new job has just landed in it. */
        queryClient.invalidateQueries({ queryKey: agentKeys.jobs(agentId) }),
        queryClient.invalidateQueries({ queryKey: agentKeys.detail(agentId) }),
      ]);
    },
    onError: (error) => {
      console.error('[kattegat] commission failed', error);
    },
  });
}
