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
