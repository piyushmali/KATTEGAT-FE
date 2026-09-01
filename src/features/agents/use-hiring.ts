'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import type { GrantSessionInput } from '../../lib/api/contract';

/**
 * Hiring an agent, and taking the authority back.
 *
 * Grant and revoke are plain mutations with no optimistic update, deliberately. Each is a
 * transaction on BNB Chain that takes seconds and can fail, and what is being reported is
 * whether an agent currently holds authority over money. Showing "revoked" before the chain
 * confirms it would tell someone they are safe while the agent can still act, which is the one
 * lie this feature must not tell. Slower, and correct.
 */

export const hiringKeys = {
  sessions: (agentId: string) => ['hiring', 'sessions', agentId] as const,
};

export function useAgentSessions(agentId: string) {
  return useQuery({
    queryKey: hiringKeys.sessions(agentId),
    queryFn: ({ signal }) => api.listAgentSessions(agentId, signal),
    /*
     * Polled, because a session expires against a wall clock rather than an event. Nothing
     * tells the browser when `expiresAt` passes, so an "active" badge would sit there being
     * wrong until the next navigation.
     */
    refetchInterval: 30_000,
  });
}

export function useGrantSession(agentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: GrantSessionInput) => api.grantSession(agentId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hiringKeys.sessions(agentId) });
    },
  });
}

export function useRevokeSession(agentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (publicKey: string) => api.revokeSession(publicKey),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hiringKeys.sessions(agentId) });
    },
  });
}
