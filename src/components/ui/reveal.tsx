'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Reveals its children once, as they enter the viewport.
 *
 * Motion in KATTEGAT is meant to read as weight settling — a ship losing way coming
 * into a harbour — so the transition is long (900ms) and eased with `--ease-fjord`,
 * which leaves quickly and arrives slowly. Only `opacity` and `transform` move; both
 * are compositor properties, so a settle that long stays on the GPU and cannot trigger
 * layout. The actual transition lives in `styles/globals.css` under `[data-reveal]`,
 * which keeps the timing with the rest of the design tokens instead of in a component.
 *
 * THIS COMPONENT MUST NEVER BE ABLE TO HIDE CONTENT PERMANENTLY. A scroll reveal that
 * fails closed is a broken page, not a missing animation, so there are three
 * independent ways out and none of them depend on this effect running:
 *
 *   1. `prefers-reduced-motion` forces `[data-reveal]` visible in CSS. Users who asked
 *      for no motion never see a hidden state at all, even before hydration.
 *   2. A `<noscript>` rule in the site layout does the same when JS never arrives.
 *   3. If `IntersectionObserver` is missing, this shows immediately rather than waiting
 *      for an observation that will never come.
 *
 * No dependency. An observer and a class swap is the whole requirement, and a scroll
 * library would ship far more than that to do it less accessibly.
 */
export function Reveal({
  children,
  className,
  as: Tag = 'div',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  /**
   * The element to render. Worth having: a wrapper `div` would become the grid or flex
   * item in place of the child and quietly break the composition it is revealing.
   */
  as?: 'div' | 'section' | 'article' | 'header' | 'li' | 'figure';
  /** Stagger, in ms. Used to walk a group in rather than landing it all at once. */
  delay?: number;
}) {
  /*
   * A callback ref rather than `useRef`, so the observer is attached the moment the
   * node exists and re-attaches if it is replaced. It also sidesteps having to reconcile
   * one ref type against six possible elements.
   */
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!node || shown) return;

    /*
     * No observer — an ancient browser, or a test environment like jsdom. Show rather
     * than wait for an observation that will never arrive.
     *
     * Deferred to a microtask so this takes the same asynchronous path as the observer
     * callback below. Setting state synchronously in an effect would render twice, and
     * `react-hooks/set-state-in-effect` is right to reject it.
     */
    if (typeof IntersectionObserver === 'undefined') {
      queueMicrotask(() => {
        setShown(true);
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setShown(true);
        // Once only. This is an entrance, not a scroll-linked effect, and re-hiding
        // content the user has already read is disorienting.
        observer.disconnect();
      },
      /*
       * Starts a little before the element reaches the fold so the settle is finishing
       * as it arrives, rather than beginning once it is already in view — the
       * difference between a considered entrance and a lurch.
       */
      { rootMargin: '0px 0px -10% 0px', threshold: 0.01 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [node, shown]);

  return (
    <Tag
      ref={setNode}
      data-reveal={shown ? 'shown' : 'hidden'}
      // Inline because the value is per-instance; there is no sane token for "the
      // third item in this particular group".
      style={delay > 0 ? { transitionDelay: `${String(delay)}ms` } : undefined}
      className={className}
    >
      {children}
    </Tag>
  );
}
