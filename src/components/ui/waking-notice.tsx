'use client';

import { useEffect, useState } from 'react';

/**
 * Explains an unusually long first load instead of leaving the visitor to guess.
 *
 * The API runs on a free instance that spins down after 15 minutes of inactivity and then
 * takes 50 seconds or more to answer the request that wakes it. During that minute the page
 * is a grid of skeletons with no explanation, which reads as broken — and the person most
 * likely to see it is the first visitor after a quiet spell, which during judging is exactly
 * the wrong person to leave guessing.
 *
 * Raising the request timeout stops that becoming an error. This stops it looking like one.
 * A minute of silence is a failure; a minute with "waking the index, this takes about a
 * minute" is a system doing something explicable, and the difference is entirely in whether
 * the product bothered to say so.
 *
 * WHY IT WAITS
 *
 * Nothing appears for the first few seconds, because a warm response arrives in well under a
 * second and announcing a cold start on every navigation would be alarming noise about a
 * problem that is not happening. It only speaks once the load has clearly left the normal
 * range.
 *
 * Mount it only while a query is loading. The delay is measured from mount, so unmounting on
 * success is what cancels it.
 */
export function WakingNotice({
  /** How long a load has to run before it is worth explaining. */
  afterMs = 5_000,
  className,
}: {
  afterMs?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, afterMs);

    return () => {
      clearTimeout(timer);
    };
  }, [afterMs]);

  if (!visible) return null;

  return (
    <p
      /*
       * `polite` rather than `assertive`: this is context for a wait, not an alert. A screen
       * reader should mention it when it reaches a natural pause, not interrupt.
       */
      role="status"
      aria-live="polite"
      className={className ?? 'animate-rise flex items-start gap-2.5 text-2xs leading-5 text-ink-muted'}
    >
      <span
        className="animate-live mt-1.5 size-1 shrink-0 rounded-pill bg-caution"
        aria-hidden="true"
      />
      <span>
        <span className="text-ink-secondary">Waking the index.</span> The API sleeps after 15
        minutes idle on its free tier and takes up to a minute to start. Nothing is broken and
        the data is on its way.
      </span>
    </p>
  );
}
