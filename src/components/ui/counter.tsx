'use client';

import { useEffect, useRef, useState } from 'react';
import { formatCount } from '../../lib/utils/format';

/**
 * A figure that counts up to its value once, when it first becomes visible.
 *
 * WHY, AND WHY IT IS NOT DECORATION
 *
 * The counts on this page are real reads over an on-chain index, and they were rendered as
 * static text — indistinguishable from a number typed into a marketing page. That is the
 * gap this closes: a figure that arrives at its value tells you it was measured, and it is
 * the cheapest honest way to say "this is an index" rather than "this is a claim".
 *
 * The pattern is Motion Primitives' animated counter, implemented without it. The library
 * is built on framer-motion, which is around 35KB gzipped on a page already shipping 318KB
 * of JavaScript to a free-tier host, and this needs none of it: one rAF loop, one state
 * value, and no layout work at any point. The rest of the product's motion already runs
 * this way — `Reveal` is an IntersectionObserver over CSS transitions — so this matches the
 * architecture rather than importing a second one.
 *
 * HONESTY CONSTRAINTS
 *
 * Counts up to the real figure and stops. It never loops, never re-runs on scroll, and
 * never ticks past the value to fake activity, because a number that keeps moving would be
 * inventing data on a page whose entire position is that it does not.
 *
 * `prefers-reduced-motion` gets the final value immediately — not a faster count. Anyone
 * who asked for no motion should see the answer, not a shorter animation of it. The initial
 * render is also the final value, so the figure is correct with JavaScript disabled and
 * server-rendered HTML never shows a zero.
 */

/**
 * Ease-out cubic. Fast at the start, settling long — the same shape as `--ease-fjord`, so a
 * counter and a panel reveal feel like they belong to one system.
 */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function Counter({
  value,
  durationMs = 1100,
  className,
}: {
  value: number;
  durationMs?: number;
  className?: string;
}) {
  /*
   * Starts at the answer. Server-rendered HTML and the no-JS case therefore both carry the
   * real figure, and the animation is something that happens to a correct number rather
   * than the only way to arrive at one.
   */
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (node === null) return;

    /*
     * Optional-called, because `matchMedia` is not guaranteed. jsdom ships without it and so
     * do some embedded webviews, and an unguarded call throws inside an effect — which in
     * React 19 takes the surrounding tree down. Absent the API, the figure simply does not
     * animate, which is the safe direction to fail.
     */
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true) return;
    // Nothing to count toward, and counting to zero from zero is a pointless frame budget.
    if (value <= 0) return;

    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || hasRun.current) return;

        // Once only. A figure that re-counts every time it scrolls back into view reads as
        // a broken widget, and it is also the point at which this stops being information.
        hasRun.current = true;
        observer.disconnect();

        const started = performance.now();
        const tick = (now: number): void => {
          const progress = Math.min((now - started) / durationMs, 1);
          setShown(Math.round(easeOut(progress) * value));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };

        setShown(0);
        frame = requestAnimationFrame(tick);
      },
      // Fires a little before the figure is fully on screen, so the count is already
      // running by the time the reader's eye arrives rather than starting under it.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.1 },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [value, durationMs]);

  return (
    /*
     * `tabular` is load-bearing rather than stylistic: proportional digits change width as
     * they count, so the figure would jitter and shove whatever sits beside it for the whole
     * animation. `aria-label` carries the final value, so assistive technology is told the
     * answer instead of whatever frame it happened to read.
     */
    <span ref={ref} className={className} aria-label={formatCount(value)}>
      <span aria-hidden="true" className="tabular">
        {formatCount(shown)}
      </span>
    </span>
  );
}
