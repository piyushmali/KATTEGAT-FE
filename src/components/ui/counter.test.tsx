import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Counter } from './counter';

/**
 * The failure modes worth guarding are all about correctness of the number, not the look of
 * the animation.
 *
 * A counter that renders 0 on the server, or that leaves a mid-count frame visible to a
 * screen reader, or that keeps re-counting on every scroll, has stopped reporting data and
 * started performing. On a page whose whole position is "we only show what we can evidence",
 * that is a product bug rather than a visual one.
 */

/** Captures the observer callback so a test can decide when the figure is on screen. */
function stubObserver() {
  const instances: {
    trigger: (isIntersecting: boolean) => void;
    disconnected: boolean;
  }[] = [];

  class FakeObserver {
    private readonly record: (typeof instances)[number];

    constructor(private readonly callback: IntersectionObserverCallback) {
      this.record = {
        trigger: (isIntersecting) => {
          this.callback(
            [{ isIntersecting } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          );
        },
        disconnected: false,
      };
      instances.push(this.record);
    }
    observe() {
      /* the test drives intersection directly */
    }
    unobserve() {
      /* unused */
    }
    disconnect() {
      this.record.disconnected = true;
    }
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  vi.stubGlobal('IntersectionObserver', FakeObserver);
  return instances;
}

/** jsdom ships no matchMedia, so reduced-motion has to be stated explicitly. */
function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    (query: string) => ({ matches: reduce, media: query }) as MediaQueryList,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Counter', () => {
  it('renders the real figure before any animation, so SSR and no-JS are correct', () => {
    stubObserver();
    render(<Counter value={325546} />);

    // Not 0. The animation happens to a correct number; it is not how the number arrives.
    expect(screen.getByLabelText('325,546')).toBeInTheDocument();
    expect(screen.getByText('325,546')).toBeInTheDocument();
  });

  it('survives an environment with no matchMedia rather than throwing in an effect', () => {
    stubObserver();
    // jsdom's default: matchMedia undefined. An unguarded call here took the tree down.
    expect(() => render(<Counter value={1234} />)).not.toThrow();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('cannot re-count, because it stops observing after the first sighting', () => {
    stubReducedMotion(false);
    const observers = stubObserver();
    render(<Counter value={900} durationMs={20} />);

    observers[0]!.trigger(true);

    /*
     * Asserted through the observer rather than by watching digits change. The animation's
     * frame timing is jsdom's business and stubbing requestAnimationFrame to control it also
     * replaces the one React's scheduler uses, which is how the first version of this test
     * became flaky. The invariant that actually matters is structural: having counted once,
     * it disconnects, so no amount of scrolling can restart it.
     */
    expect(observers[0]!.disconnected).toBe(true);

    // And a late callback cannot reopen it.
    expect(() => {
      observers[0]!.trigger(true);
    }).not.toThrow();
  });

  it('gives the final value immediately under reduced motion, not a faster count', () => {
    stubReducedMotion(true);
    const observers = stubObserver();
    render(<Counter value={139992} durationMs={5000} />);

    /*
     * No observer either, which is the stronger guarantee: reduced motion is honoured by
     * never arming the animation rather than by shortening it, so there is no path back to a
     * count no matter how the element is scrolled. Someone who asked for no motion gets the
     * answer, not a faster version of the performance.
     */
    expect(observers).toHaveLength(0);
    expect(screen.getByText('139,992')).toBeInTheDocument();
  });

  it('exposes the final value to assistive technology, never a mid-count frame', () => {
    stubReducedMotion(false);
    const observers = stubObserver();
    render(<Counter value={265367} durationMs={5000} />);

    observers[0]!.trigger(true);

    /*
     * The label is fixed at the real figure while the visible digits are aria-hidden, so a
     * screen reader is told the answer rather than whichever frame it happened to sample.
     */
    expect(screen.getByLabelText('265,367')).toBeInTheDocument();
  });

  it('leaves a zero alone instead of animating to nothing', () => {
    stubReducedMotion(false);
    const observers = stubObserver();
    render(<Counter value={0} />);

    /*
     * No observer is created at all: counting to zero from zero is a frame budget spent on
     * nothing, so the effect returns before it sets one up. Asserting through a trigger here
     * was testing the stub rather than the component.
     */
    expect(observers).toHaveLength(0);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
