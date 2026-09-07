import { describe, expect, it } from 'vitest';
import { ApiError, describeWeb3Error } from './errors';

/**
 * `describeWeb3Error` is what a viewer reads when a hire, revoke or commission fails, and it
 * exists because the previous code flattened every one of those failures to "an unexpected
 * error occurred". These cases pin the behaviour that matters on camera and for diagnosis:
 * the real message survives, a dismissed prompt is not dressed as a fault, and a backend
 * failure still routes through the API copy.
 */

describe('describeWeb3Error', () => {
  it('surfaces the real message from a thrown Error instead of a generic one', () => {
    const result = describeWeb3Error(
      new Error('A session must name at least one contract the agent may call.'),
    );

    expect(result.detail).toBe('A session must name at least one contract the agent may call.');
    // Not the old generic string.
    expect(result.detail).not.toMatch(/unexpected error occurred/i);
  });

  it('treats a WebAuthn cancellation as a dismissal, not a failure', () => {
    // Node's DOMException; name is what the branch keys on, matching a real WebAuthn cancel.
    const cancelled = new DOMException('The operation was aborted', 'NotAllowedError');

    const result = describeWeb3Error(cancelled);

    expect(result.title).toBe('Approval dismissed');
    expect(result.detail).toMatch(/nothing was signed/i);
  });

  it('recognises wallet-phrased rejections as dismissals', () => {
    for (const message of [
      'User rejected the request',
      'MetaMask Tx Signature: User denied transaction signature',
      'The user cancelled the operation',
    ]) {
      expect(describeWeb3Error(new Error(message)).title).toBe('Approval dismissed');
    }
  });

  it('defers a backend ApiError to the API describer', () => {
    // sponsorGas / recordSession can fail as real API errors mid-flow.
    const apiError = new ApiError({ code: 'RATE_LIMITED', message: 'slow down', status: 429 });

    const result = describeWeb3Error(apiError);

    expect(result.title).toBe('Too many requests');
  });

  it('caps a long revert string to the first line, so it cannot overrun the panel', () => {
    const viemStyle =
      'execution reverted: ExceededSpendLimit\n\nContract Call:\n  address: 0xabc\n  ...stack...';

    const result = describeWeb3Error(viemStyle);

    expect(result.detail).toBe('execution reverted: ExceededSpendLimit');
    expect(result.detail).not.toContain('\n');
  });

  it('truncates a single very long line rather than letting it run', () => {
    const long = 'x'.repeat(300);

    const result = describeWeb3Error(new Error(long));

    expect(result.detail.length).toBeLessThanOrEqual(160);
    expect(result.detail.endsWith('…')).toBe(true);
  });

  it('falls back to a generic detail only when there is genuinely no message', () => {
    expect(describeWeb3Error({}).detail).toMatch(/unexpected error occurred/i);
    expect(describeWeb3Error(undefined).detail).toMatch(/unexpected error occurred/i);
  });
});
