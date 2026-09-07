import { apiErrorSchema } from './contract';

/**
 * Client-side error model.
 *
 * Every failure reaching a component is an {@link ApiError} carrying a stable
 * `code`, so error UI branches on a token rather than string-matching a message.
 * `requestId` is surfaced because the backend logs the same id — it turns "it
 * broke" into something diagnosable.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId: string | null;
  readonly details: unknown;

  constructor(init: {
    code: string;
    message: string;
    status: number;
    requestId?: string | null;
    details?: unknown;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.code = init.code;
    this.status = init.status;
    this.requestId = init.requestId ?? null;
    this.details = init.details;
  }

  /** True when retrying could plausibly succeed — drives whether we show "Retry". */
  get isRetryable(): boolean {
    return (
      this.status >= 500 ||
      this.status === 429 ||
      this.code === 'NETWORK_ERROR' ||
      this.code === 'UPSTREAM_UNAVAILABLE'
    );
  }
}

/** Builds an ApiError from a non-2xx response, using the API envelope when present. */
export async function apiErrorFromResponse(response: Response): Promise<ApiError> {
  const requestId = response.headers.get('x-request-id');

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return new ApiError({
      code: 'UNPARSEABLE_ERROR',
      message: `Request failed with status ${String(response.status)}.`,
      status: response.status,
      requestId,
    });
  }

  const parsed = apiErrorSchema.safeParse(payload);
  if (parsed.success) {
    return new ApiError({
      code: parsed.data.error.code,
      message: parsed.data.error.message,
      status: response.status,
      requestId: parsed.data.error.request_id || requestId,
      details: parsed.data.error.details,
    });
  }

  return new ApiError({
    code: 'UNEXPECTED_ERROR',
    message: `Request failed with status ${String(response.status)}.`,
    status: response.status,
    requestId,
  });
}

/**
 * Copy for a failure in the on-chain hire flow (grant, revoke, commission).
 *
 * Separate from {@link describeError} because those failures are not `ApiError`s — they are
 * raw errors from the passkey, the Altana SDK or viem — and routing them through the API
 * describer flattened every one of them to "an unexpected error occurred". That threw away the
 * only useful thing the error had: its message. During a demo it turned a readable cause into a
 * shrug, and it hid meaningful thrown messages like "this browser has no agent authority stored"
 * behind a generic one.
 *
 * Three cases it actually distinguishes:
 *  - a backend step failing (sponsorGas, recordSession) is still an ApiError, so defer to the
 *    API describer for those;
 *  - the user dismissing the biometric prompt is not an error at all, and saying "declined" is
 *    calmer and truer than "something went wrong";
 *  - anything else surfaces its real message, capped so a long viem revert string does not
 *    overrun the panel.
 *
 * The message is the point. It is what lets the operator — or a judge — see that the passkey was
 * cancelled, or the relay is down, or a contract reverted, rather than being told nothing.
 */
export function describeWeb3Error(error: unknown): { title: string; detail: string } {
  if (error instanceof ApiError) return describeError(error);

  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : '';

  // WebAuthn cancellation surfaces as a NotAllowedError DOMException, or as a message the
  // wallet/SDK phrases in one of these ways. This is a choice the user made, not a fault.
  const dismissed =
    (typeof DOMException !== 'undefined' &&
      error instanceof DOMException &&
      error.name === 'NotAllowedError') ||
    /\b(rejected|denied|cancell?ed|dismiss|abort|not allowed|user declined)\b/i.test(raw);

  if (dismissed) {
    return {
      title: 'Approval dismissed',
      detail: 'Nothing was signed or sent. Choose the terms again and approve with your device.',
    };
  }

  if (raw.length > 0) {
    // Capped, and stripped of the noisy stack-y tail viem appends after the first sentence.
    const firstLine = raw.split('\n')[0]!.trim();
    return {
      title: 'The hire did not complete',
      detail: firstLine.length > 160 ? `${firstLine.slice(0, 157)}…` : firstLine,
    };
  }

  return { title: 'The hire did not complete', detail: 'An unexpected error occurred. Try again.' };
}

/** Copy for the states the UI actually needs to distinguish. */
export function describeError(error: unknown): { title: string; detail: string } {
  if (!(error instanceof ApiError)) {
    return {
      title: 'Something went wrong',
      detail: 'An unexpected error occurred. Try again.',
    };
  }

  switch (error.code) {
    case 'NETWORK_ERROR':
      return {
        title: 'Cannot reach the marketplace',
        detail:
          'The KATTEGAT API did not respond. Confirm the backend is running and NEXT_PUBLIC_API_BASE_URL is correct.',
      };
    case 'NOT_FOUND':
      return { title: 'Not found', detail: error.message };
    case 'RATE_LIMITED':
      return { title: 'Too many requests', detail: 'Slow down for a moment, then retry.' };
    case 'UPSTREAM_UNAVAILABLE':
      return {
        title: 'Upstream data source unavailable',
        detail:
          'An external dependency (RPC endpoint or metadata gateway) is not responding. Data may be stale.',
      };
    case 'UPSTREAM_PAYMENT_REQUIRED':
      return {
        title: 'Enriched data unavailable',
        detail:
          'The ERC-8004 Explorer API requires an x402 micropayment that is not configured. Core marketplace data is unaffected.',
      };
    case 'CONTRACT_MISMATCH':
      return {
        title: 'Unexpected API response',
        detail:
          'The API returned data that does not match the expected contract. The frontend and backend versions may have diverged.',
      };
    case 'VALIDATION_FAILED':
      return { title: 'Invalid request', detail: error.message };
    default:
      return { title: 'Something went wrong', detail: error.message };
  }
}
