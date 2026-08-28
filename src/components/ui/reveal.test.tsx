import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { Reveal } from './reveal';

/**
 * The failure mode worth guarding is not "the animation looked wrong" — it is content
 * that never appears. A reveal that fails closed is a blank page.
 *
 * jsdom ships no `IntersectionObserver`, which makes the missing-observer fallback
 * testable for free; the observing path gets a minimal stub that lets the test decide
 * when the element intersects.
 */

/** Captures the callback so a test can drive intersection explicitly. */
function stubObserver() {
  const instances: Array<{ trigger: (isIntersecting: boolean) => void; disconnected: boolean }> =
    [];

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
      /* nothing to do: the test drives intersection directly */
    }
    unobserve() {
      /* not used by Reveal */
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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Reveal', () => {
  it('always renders its children, whatever the reveal state', () => {
    render(<Reveal>harbour</Reveal>);
    expect(screen.getByText('harbour')).toBeTruthy();
  });

  describe('when IntersectionObserver is unavailable', () => {
    beforeEach(() => {
      // jsdom has none, so this is the real environment rather than a contrivance.
      expect(typeof IntersectionObserver).toBe('undefined');
    });

    it('shows immediately instead of waiting for an observation that never comes', async () => {
      render(<Reveal>longship</Reveal>);
      await waitFor(() => {
        expect(screen.getByText('longship').getAttribute('data-reveal')).toBe('shown');
      });
    });
  });

  describe('when an observer is available', () => {
    it('starts hidden and settles once the element intersects', async () => {
      const observers = stubObserver();
      render(<Reveal>fjord</Reveal>);

      const element = screen.getByText('fjord');
      expect(element.getAttribute('data-reveal')).toBe('hidden');

      observers[0]!.trigger(true);

      await waitFor(() => {
        expect(element.getAttribute('data-reveal')).toBe('shown');
      });
    });

    it('stays hidden while the element is out of view', async () => {
      const observers = stubObserver();
      render(<Reveal>mist</Reveal>);

      observers[0]!.trigger(false);

      await waitFor(() => {
        expect(screen.getByText('mist').getAttribute('data-reveal')).toBe('hidden');
      });
    });

    it('disconnects after revealing, so it does not re-hide on the way back', async () => {
      const observers = stubObserver();
      render(<Reveal>ember</Reveal>);

      observers[0]!.trigger(true);
      await waitFor(() => {
        expect(observers[0]!.disconnected).toBe(true);
      });

      // A late callback must not undo it.
      observers[0]!.trigger(false);
      expect(screen.getByText('ember').getAttribute('data-reveal')).toBe('shown');
    });
  });

  it('renders the requested element so it can stand in for a grid or flex child', () => {
    const observers = stubObserver();
    render(<Reveal as="section">quay</Reveal>);
    expect(screen.getByText('quay').tagName).toBe('SECTION');
    expect(observers).toHaveLength(1);
  });

  it('applies a stagger as a transition delay', () => {
    stubObserver();
    render(<Reveal delay={180}>stagger</Reveal>);
    expect(screen.getByText('stagger').style.transitionDelay).toBe('180ms');
  });
});
