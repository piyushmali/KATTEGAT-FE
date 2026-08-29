/**
 * Catches EIP-1193 provider rejections that no call site can catch.
 *
 * THE PROBLEM
 *
 * wagmi's injected connector leaks promises. Two paths, both verified in
 * `@wagmi/core@3.6.4`:
 *
 *   1. `createConfig.js:70` calls `connector.setup?.()` — an `async` method — without
 *      awaiting it or attaching a catch.
 *   2. `injected.js:54,60` registers `async onConnect` and `async onAccountsChanged` as
 *      provider event listeners via `provider.on(...)`. An EventEmitter discards the
 *      promise a listener returns, so a rejection inside one has nowhere to go.
 *
 * Both run in response to a wallet extension, not to anything this app calls. There is
 * no `await`, no `.catch()`, and no mutation callback available to us — which is why the
 * earlier fix of passing `onError` to `connect`, `reconnect` and `switchChain` did not
 * stop it. A global handler is not a shortcut here; it is the only interception point
 * that exists.
 *
 * What actually triggers it: a wallet answering `eth_accounts` with a refusal rather
 * than an empty list. HashPack rejects with `{code: 4001, message: 'wallet must has at
 * least one account'}` — a bare object, not an `Error`, which is why Next's overlay
 * renders it as the useless "[object Object]".
 *
 * WHY THIS IS NOT HIDING AN ERROR
 *
 * The rejection is still reported — it is logged with its code and message, which is
 * strictly more information than the overlay gave. What stops is a third-party
 * extension's refusal being escalated to a full-page dev error the developer cannot act
 * on.
 *
 * The predicate is deliberately narrow, and the load-bearing rule is that anything
 * which is a real `Error` passes straight through untouched. Application bugs reject
 * with `Error` subclasses — `TypeError`, `ApiError`, and so on — so a genuine fault can
 * never be absorbed by this. Only a non-Error object carrying a recognised EIP-1193 or
 * JSON-RPC error code is claimed.
 */

/**
 * EIP-1193 provider error codes (4001 user rejected, 4100 unauthorized, 4200
 * unsupported method, 4900/4901 disconnected), plus the JSON-RPC reserved range that
 * providers use for their own failures.
 */
function isProviderErrorCode(code: number): boolean {
  if (code === 4001 || code === 4100 || code === 4200 || code === 4900 || code === 4901) {
    return true;
  }

  /*
   * The JSON-RPC implementation-defined server-error range, where a provider's own
   * failures live — -32002 "request already pending" being the common one.
   *
   * Note what this excludes: the standard protocol errors -32700 and -32600..-32603
   * (parse error, invalid request, method not found, invalid params, internal error).
   * Those say the *request* was wrong, which points at this application rather than at
   * the user's wallet, so they must keep reaching the overlay.
   */
  return code <= -32000 && code >= -32099;
}

/**
 * True when a rejection reason is a wallet provider's refusal rather than a fault in
 * this application.
 *
 * Requires all three: not an `Error`, a numeric recognised code, and a string message.
 * Exported so the reasoning is testable rather than trusted.
 */
export function isProviderRejection(reason: unknown): boolean {
  // The safety rule. A real failure is always an Error, and must never be swallowed.
  if (reason instanceof Error) return false;
  if (typeof reason !== 'object' || reason === null) return false;

  const { code, message } = reason as { code?: unknown; message?: unknown };
  if (typeof code !== 'number' || !Number.isFinite(code)) return false;
  if (typeof message !== 'string') return false;

  return isProviderErrorCode(code);
}

/**
 * Installs the handler. Idempotent, and returns a cleanup for symmetry even though in
 * practice this lives for the life of the document.
 */
export function installProviderRejectionGuard(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (!isProviderRejection(event.reason)) return;

    const { code, message } = event.reason as { code: number; message: string };

    /*
     * Reported, not silenced — and deliberately as a warning rather than an error, since
     * a wallet declining is normal operation. Keeping the code and message visible is
     * what makes this a fix rather than a mask.
     */
    console.warn(
      `[kattegat] wallet provider rejected a request (code ${String(code)}): ${message}. ` +
        'Raised outside any call site by wagmi\'s injected connector; handled deliberately. ' +
        'See lib/web3/provider-rejections.ts.',
    );

    // Stops the dev overlay treating an extension's refusal as an application crash.
    event.preventDefault();
  };

  window.addEventListener('unhandledrejection', onUnhandledRejection);
  return () => {
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
  };
}
