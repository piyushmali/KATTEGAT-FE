import { afterEach, describe, expect, it, vi } from 'vitest';
import { installProviderRejectionGuard, isProviderRejection } from './provider-rejections';

/**
 * The whole value of this guard rests on one property: it must never absorb a real
 * application error. So that is what most of these assert.
 *
 * A guard that is too eager would silently eat a `TypeError` from a bad render or an
 * `ApiError` from a failed request, which is far worse than the dev-overlay noise it was
 * written to stop.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

describe('isProviderRejection — claims wallet refusals', () => {
  it('claims the HashPack rejection that motivated this', () => {
    // Observed verbatim in the wild, and the reason the overlay showed "[object Object]".
    expect(
      isProviderRejection({ code: 4001, message: 'wallet must has at least one account' }),
    ).toBe(true);
  });

  it.each([
    [4001, 'user rejected'],
    [4100, 'unauthorized'],
    [4200, 'unsupported method'],
    [4900, 'disconnected'],
    [4901, 'chain disconnected'],
    [-32002, 'request already pending'],
  ])('claims EIP-1193/JSON-RPC code %i', (code, message) => {
    expect(isProviderRejection({ code, message })).toBe(true);
  });

  it.each([
    [-32700, 'parse error'],
    [-32600, 'invalid request'],
    [-32601, 'method not found'],
    [-32602, 'invalid params'],
    [-32603, 'internal error'],
  ])('deliberately does NOT claim JSON-RPC protocol error %i', (code, message) => {
    /*
     * The line is drawn here on purpose. Codes -32700 and -32600..-32603 mean the
     * *request* was wrong — malformed, unknown method, bad params — which points at this
     * application, not at the user's wallet. Those must keep reaching the overlay.
     *
     * Absorbed instead: the EIP-1193 codes, which describe a wallet's decision, and the
     * -32000..-32099 implementation-defined range where "already pending" lives.
     */
    expect(isProviderRejection({ code, message })).toBe(false);
  });
});

describe('isProviderRejection — never claims an application fault', () => {
  it('lets a real Error through even when it carries a provider-shaped code', () => {
    /*
     * The load-bearing case. Application bugs reject with Error subclasses, so being an
     * Error is an unconditional escape hatch — even if something attaches a code to it.
     */
    const error = Object.assign(new Error('user rejected'), { code: 4001 });
    expect(isProviderRejection(error)).toBe(false);
  });

  it('lets a TypeError through', () => {
    expect(isProviderRejection(new TypeError('x is not a function'))).toBe(false);
  });

  it('does not claim an unrecognised code', () => {
    // Not an EIP-1193 or JSON-RPC reserved code, so not ours to absorb.
    expect(isProviderRejection({ code: 500, message: 'server exploded' })).toBe(false);
    expect(isProviderRejection({ code: 0, message: 'nope' })).toBe(false);
  });

  it('does not claim objects missing a numeric code or string message', () => {
    expect(isProviderRejection({ message: 'no code' })).toBe(false);
    expect(isProviderRejection({ code: 4001 })).toBe(false);
    expect(isProviderRejection({ code: '4001', message: 'string code' })).toBe(false);
    expect(isProviderRejection({ code: Number.NaN, message: 'not finite' })).toBe(false);
  });

  it('does not claim primitives or null', () => {
    expect(isProviderRejection(null)).toBe(false);
    expect(isProviderRejection(undefined)).toBe(false);
    expect(isProviderRejection('a string rejection')).toBe(false);
    expect(isProviderRejection(4001)).toBe(false);
  });
});

describe('the installed listener', () => {
  /**
   * jsdom does not implement `PromiseRejectionEvent`, so this builds the shape the
   * handler reads: a cancelable event carrying `reason`.
   */
  function rejectionEvent(reason: unknown): Event {
    const event = new Event('unhandledrejection', { cancelable: true });
    Object.defineProperty(event, 'reason', { value: reason });
    return event;
  }

  it('prevents the default for a wallet refusal, and reports it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const uninstall = installProviderRejectionGuard();

    const event = rejectionEvent({ code: 4001, message: 'wallet must has at least one account' });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    // Still surfaced, with the code and message intact — handled, not hidden.
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain('4001');
    expect(warn.mock.calls[0]?.[0]).toContain('wallet must has at least one account');

    uninstall();
  });

  it('leaves a real error alone so the overlay still reports it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const uninstall = installProviderRejectionGuard();

    const event = rejectionEvent(new TypeError('genuine bug'));
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(warn).not.toHaveBeenCalled();

    uninstall();
  });

  it('stops handling once uninstalled', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const uninstall = installProviderRejectionGuard();
    uninstall();

    const event = rejectionEvent({ code: 4001, message: 'declined' });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });
});
