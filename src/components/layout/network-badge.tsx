'use client';

import dynamic from 'next/dynamic';

/**
 * Browser-only network control.
 *
 * Kept out of the server render because it reads wallet state from an injected
 * provider that does not exist on the server — rendering it there guarantees a
 * hydration mismatch, since the server always assumes "not connected".
 */
const NetworkControl = dynamic(
  async () => {
    const mod = await import('./network-control');
    return mod.NetworkControl;
  },
  {
    ssr: false,
    // Reserves the control's footprint so the header does not shift on hydration.
    loading: () => <div className="h-8 w-[10.5rem]" aria-hidden="true" />,
  },
);

export function NetworkBadge() {
  return <NetworkControl />;
}
