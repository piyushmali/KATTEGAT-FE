'use client';

import { useEffect, useState } from 'react';

/**
 * Delays propagating a rapidly-changing value.
 *
 * Used for the search box so typing stays instant while the network request only
 * fires once the user pauses. The timer is cleared on every change, so only the
 * final value in a burst is ever emitted.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debounced;
}
